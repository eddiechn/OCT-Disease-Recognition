

function Footer()  {
    return (
        <footer style={footerStyle}>
            <p style={{color: "#000000"}}> 
                Made by Eddie Chen. 
                <a href="https://github.com/eddiechn/oct-disease" style={{marginLeft: "5px"}}>
                    Github Repo
                </a>
            </p>
        </footer>
    )
}

const footerStyle = {
    textAlign: "center",
    padding: "5px",

    left: "0",
    bottom: "0",
    width: "100%",
    backgroundColor: "#A6D3FB",
    fontSize: "15px"
}

export default Footer;
