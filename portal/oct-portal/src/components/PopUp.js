import React from 'react';
import Popup from 'reactjs-popup';

import '../styles/PopUp.css';


export default function PopUp() {
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
                            The model has detected disease in the image. The disease is called <b>placeholder</b>. The model is 95% confident in its prediction.
                            <br />
                            <br />

                            <b>Refresh page for next eye image analysis.</b>
                            <br />
                            <button
                                onClick={() => {
                                    window.location.reload(); // Refreshes the page
                                    close(); // Closes the modal
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