import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import '../styles/AnalysisDetails.css'; // Ensure you have external styles for grid layout
import { Link } from 'react-router-dom';

export default function AnalysisDetails() {
    // Retrieve the state passed from the previous page (e.g., ImageUpload)
    const location = useLocation();
    const { result, message } = location.state || {};  // Default to an empty object if no state

    const [criteria, setCriteria] = useState({
        recentSurgery: '',
        eyeConditions: '',
        pain: '',
        blurryVision: '',
        redness: '',
        headaches: ''
    });

    const [recommendation, setRecommendation] = useState('');
    
    // Appointment-related states
    const [originalDate, setOriginalDate] = useState('');
    const [newDate, setNewDate] = useState('');
    const [daysSaved, setDaysSaved] = useState(null);
    const [percentageSaved, setPercentageSaved] = useState(null);
    const [alert, setAlert] = useState('');
    const [eyeConditions, setEyeConditions] = useState('');


    // Automatically set the "eyeConditions" criteria if the result is not 'normal'
    useEffect(() => {
        if (result && result.toLowerCase() !== 'normal') {
            setCriteria((prev) => ({ ...prev, eyeConditions: 'yes' }));
            setEyeConditions(result);
         } 
        else {
             setEyeConditions('normal');
        }
        
    }, [result]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCriteria((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const evaluateCriteria = () => {
        const { recentSurgery, eyeConditions, pain, blurryVision, redness, headaches } = criteria;

        // Count how many criteria have "yes"
        const yesCount = [recentSurgery, eyeConditions, pain, blurryVision, redness, headaches]
            .filter((item) => item === 'yes').length;

        if (yesCount >= 2) {
            setRecommendation('Advance appointment date. Consult with a specialist.');
        } else {
            setRecommendation('No immediate concerns. Maintain appointment schedule.');
        }
    };

    const handleSubmitCriteria = (e) => {
        e.preventDefault();
        evaluateCriteria();
    };

    // Handle appointment submission to SQL database
    const handleSubmitAppointment = async (e) => {
        e.preventDefault();

        // Check if both dates are selected
        if (!originalDate || !newDate) {
            setAlert('Please select both dates.');
            return;
        }

        // Send data to the backend to store in SQL database
        try {
            const response = await axios.post('http://localhost:5000/add_appointment', {
                original_date: originalDate,
                new_date: newDate,
            });

            // Set the response values
            setDaysSaved(response.data.days_saved);
            setPercentageSaved(response.data.percentage_saved);
            setAlert('Appointment dates saved to SQL database successfully!');
        } catch (error) {
            console.error('Error submitting data:', error);
            setAlert('Error saving appointment data to SQL database.');
        }
    };

    return (
        <div className="analysis-details-page">
            <h1>AI Analysis Details</h1>
            <br />
            
            {/* Disease Detected Box */}
            {result && (
                <div className={eyeConditions.toLowerCase() === "normal" ? "normalbox" : "disease-box"}>
                    <h2>Disease Detected:</h2>
                    <p>{message}</p> {/* Display the detected disease */}
                </div>
            )}

            <div className="grid-container">
                {/* Left side: Criteria */}
                <div className="criteria">
                    <form onSubmit={handleSubmitCriteria}>
                        <div>
                            <label>Recent Surgery: </label>
                            <select
                                name="recentSurgery"
                                value={criteria.recentSurgery}
                                onChange={handleInputChange}
                            >
                                <option value="">Select</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                        <div>
                            <label>Pain: </label>
                            <select
                                name="pain"
                                value={criteria.pain}
                                onChange={handleInputChange}
                            >
                                <option value="">Select</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                        {/* Add more criteria */}
                        <div>
                            <label>Blurry Vision: </label>
                            <select
                                name="blurryVision"
                                value={criteria.blurryVision}
                                onChange={handleInputChange}
                            >
                                <option value="">Select</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                        <div>
                            <label>Redness: </label>
                            <select
                                name="redness"
                                value={criteria.redness}
                                onChange={handleInputChange}
                            >
                                <option value="">Select</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                        <div>
                            <label>Headaches: </label>
                            <select
                                name="headaches"
                                value={criteria.headaches}
                                onChange={handleInputChange}
                            >
                                <option value="">Select</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                        <br />
                        <button type="submit" className='button'>Evaluate</button>
                    </form>
                </div>



                {/* Right side: Appointment and Recommendation */}
                <div className="recommendation">
                    {/* Display recommendation based on criteria */}
                    {recommendation && (
                        <div>
                            <h2>Recommendation</h2>
                            <p>{recommendation}</p>
                        </div>
                    )}

                    {/* Appointment Date Adjustment Section */}
                    <form onSubmit={handleSubmitAppointment}>
                        <h2>Appointment Date Adjustment</h2>
                        <div>
                            <label>Original Appointment Date:</label>
                            <input 
                                type="date" 
                                value={originalDate} 
                                onChange={(e) => setOriginalDate(e.target.value)} 
                                required 
                            />
                        </div>

                        <div>
                            <label>New Appointment Date:</label>
                            <input 
                                type="date" 
                                value={newDate} 
                                onChange={(e) => setNewDate(e.target.value)} 
                                required 
                            />
                        </div>

                        <br />
                        <button type="submit">Calculate and Save</button>
                    </form>

                    {/* Show days saved and percentage saved */}
                    {daysSaved !== null && (
                        <div>
                            <p><strong>Days Saved:</strong> {daysSaved} days</p>
                            <p><strong>Percentage Saved:</strong> {percentageSaved.toFixed(2)}%</p>
                        </div>
                    )}

                    {/* Display alert */}
                    {alert && <p>{alert}</p>}

                    <br />
                    <b>Go back to Home Page</b>
                    <br />
                    <Link to="/home" className="button">
                        Return
                    </Link>
                </div>
            </div>
        </div>
    );
}