import React from 'react';
import Popup from 'reactjs-popup';

import '../styles/PopUp.css';


export default function PopUp({message}) {
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