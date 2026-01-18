import React from "react";
import logoImage from "../../assets/logo.png";

const HomePage = () => {
  return (
    <div className="content-wrapper">
      <div className="content container">
        <div className="content-div shadow rounded">
          <div className="pl-3 pr-3 row">
            {/* Logo section */}
            <div className="d-flex flex-column justify-content-center align-items-center col-md-4">
                <div className="logo-placeholder-content">
                  <img src={logoImage} alt="TDTUOJ Logo" className="logo-img" />
                </div>
            </div>

            {/* Welcome content section */}
            <div className="col-md-8">
              <div
                style={{ height: "100%" }}
                className="d-flex flex-column justify-content-center align-items-center"
              >
                <span className="subtext">Welcome to</span>
                <div className="big-title pt-2 pb-2">
                  <h4 className="">Ton Duc Thang University Online Judge</h4>
                </div>
                <span className="subtext text-center">
                  Your new online platform for practicing and hosting
                  programming contests, for Ton Duc Thang University.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
