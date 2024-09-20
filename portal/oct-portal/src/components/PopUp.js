import React, { useEffect } from 'react';
import Popup from 'reactjs-popup';

import '../styles/PopUp.css';


export default function PopUp({message, result}) {

    const [criteria, setCriteria] = React.useState({
        recentSurgery: '',
        eyeConditions: '',
        pain: '',
    });

    const [recommendation, setRecommendation] = React.useState('');

    useEffect(() => { 
        if (result && result.toLowerCase() !== 'normal') {
            setCriteria((prev) => ({ ...prev, eyeConditions: 'yes' }));
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
        const { recentSurgery, eyeConditions, pain } = criteria;

        const yesCount = [recentSurgery, eyeConditions, pain].filter((item) => item === 'yes').length;

        if (yesCount >= 2 ) {
            setRecommendation('Advance appointment date. Consult with a specialist.');
        } else {
            setRecommendation('No immediate concerns. Maintain apoointment schedule.');
        }



    }

    const handleSubmit = (e) => {
        e.preventDefault();
        evaluateCriteria();
    };




    return (
        <Popup trigger=
            {<button className='learn-more-btn'> 
                Learn more 
            </button>}
        modal>

            {close => (
                <div className="modal">
                    <button className="close-btn" onClick={close}>
                        &times;
                    </button>
                    <div id="info-popup">
                        <div className="modal-header"> AI Analysis Details </div>
                        <div className="modal-content">
                            {' '}
                            {message}
                            <br />
                            <br />


                            <form onSubmit={handleSubmit}>
                                <div>
                                    <label>Recent Surgery : </label>
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
                                <br />
                                <button type="submit">Evaluate</button>
                            </form>
                            <br />
                            <br />
                            {recommendation && (
                                <div>
                                    <b>Recommendation:</b> {recommendation}
                                </div>
                            )}

                            <b>Refresh page for next eye image analysis.</b>
                            <br />
                            <button
                                onClick={() => {
                                    window.location.reload(); 
                                    close(); 
                                }}
                                >
                                    Refresh Page
                            </button>
                            {' '}
                        </div>
                    </div>
                </div>
            )}
            </Popup>
    )
}
