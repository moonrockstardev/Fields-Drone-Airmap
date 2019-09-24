import React, { Component } from "react";

class MyMap extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.googleMapRef = React.createRef();
  }

  componentDidMount() {
    const googleMapScript = document.createElement("script");
    googleMapScript.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBkDqO4ZFc9wLSfg-6qHo5xdAGusxTsRyI`;
    window.document.body.appendChild(googleMapScript);
    googleMapScript.addEventListener("load", () => {
      this.googleMap = this.createGoogleMap();
      this.marker = this.createMarker();
    });
  }

  createGoogleMap() {
    return new window.google.maps.Map(this.googleMapRef.current, {
      zoom: 16,
      center: {
        lat: 43.642567,
        lng: -79.387054
      },
      disableDefaultUI: true
    });
  }
    
  createMarker() {
    return new window.google.maps.Marker({
      position: { lat: 43.642567, lng: -79.387054 },
      map: this.googleMap
    });
  }

  render() {
    return (
      <div>
        <div
          ref={this.googleMapRef}
          id="google-map"
          className="card-panel white map-holder"
        ></div>
      </div>
    );
  }
}
export default MyMap;
