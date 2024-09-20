import React, { useState } from 'react';
import axios from 'axios';

function AppointmentForm() {
  const [originalDate, setOriginalDate] = useState('');
  const [newDate, setNewDate] = useState('');
  const [daysSaved, setDaysSaved] = useState(null);
  const [percentageSaved, setPercentageSaved] = useState(null);
  const [message, setMessage] = useState('');

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if both dates are selected
    if (!originalDate || !newDate) {
      setMessage('Please select both dates.');
      return;
    }

    // Send data to the Flask backend
    try {
      const response = await axios.post('http://localhost:5000/add_appointment', {
        original_date: originalDate,
        new_date: newDate,
      });

      // Set the response values
      setDaysSaved(response.data.days_saved);
      setPercentageSaved(response.data.percentage_saved);
      setMessage('Appointment saved successfully!');
    } catch (error) {
      console.error('Error submitting data:', error);
      setMessage('Error saving appointment data.');
    }
  };

  return (
    <div>
      <h1>Appointment Date Adjustment</h1>
      
      <form onSubmit={handleSubmit}>
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

      {/* Display message */}
      {message && <p>{message}</p>}
    </div>
  );
}

export default AppointmentForm;