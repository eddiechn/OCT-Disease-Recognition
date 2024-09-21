import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/Stats.css'; // Assuming you have a separate CSS file

function Stats() {
    // State to hold the fetched data
    const [stats, setStats] = useState({
        totalDaysSaved: 0,
        totalAppointments: 0,
        avgPercentageSaved: 0,
    });

    // Fetch data from backend using GET method
    useEffect(() => {
        axios.get('http://localhost:5000/stats') // Replace with your actual API endpoint
            .then(response => {
                const { totalDaysSaved, totalAppointments, avgPercentageSaved } = response.data;
                setStats({
                    totalDaysSaved,
                    totalAppointments,
                    avgPercentageSaved,
                });
            })
            .catch(error => {
                console.error('There was an error fetching the stats!', error);
            });
    }, []);

    return (
        <div className="stats">
            <h1>Stats</h1>

            <div className="stats-container">
                {/* Card 1: Total number of days saved */}
                <div className="stats-card">
                    <h2>Total numbers of days saved</h2>
                    <p>{stats.totalDaysSaved}</p>
                </div>

                {/* Card 2: Total number of appointments rescheduled */}
                <div className="stats-card">
                    <h2>Total number of appointments rescheduled</h2>
                    <p>{stats.totalAppointments}</p>
                </div>

                {/* Card 3: Average % of days saved */}
                <div className="stats-card">
                    <h2>Average % of days saved per appointment rescheduled</h2>
                    <p>{stats.avgPercentageSaved}%</p>
                </div>
            </div>
        </div>
    );
}

export default Stats;