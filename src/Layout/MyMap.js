import React, { Component } from "react";
import { connect } from "react-redux";
import { compose } from "redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faChevronDown,
  faExpandArrowsAlt
} from "@fortawesome/free-solid-svg-icons";

import Rectangle from "../calculations/Rectangle.js";
import Drone from "../calculations/drone.js";
import Vector from "../calculations/Vector";
import Field from "../calculations/Field";
import RectField from "../calculations/RectField";
import { MainCalculation } from "../calculations/flyCalculations";
import {
  mapToVector,
  vectorToMap,
  getLngFactor
} from "../calculations/helpers";
import { pushPhoto, setMapPath } from "../store/actions/photosGallery";
import { updateDroneParameter } from "../store/actions/droneParameters";
import Photo from "../calculations/Photo";
import { scrollDown } from "../components/helpers";

const fs = window.require("fs");
const savePhotos = true;
let flightNumber, folderPath;

fs.readFile("flight_number.txt", function(err, buf) {
  flightNumber = buf.toString();
  folderPath = "./Photos/Flight" + flightNumber;
  console.log("Flight number: ", buf.toString());
});

class MyMap extends Component {
  constructor(props) {
    super(props);
    const { settings } = this.props;
    const languageSettingVal = settings.find(el => el.label === "Language")
      .value;

    this.state = {
      photos: [],

      base: null,
      field: null,
      drone: null,
      readyForStart: false,

      currentLabelIdx: 0,
      labels:
        languageSettingVal === "English"
          ? ["Set the base", "Set the field"]
          : ["Встановіть базу", "Встановіть поле"],

      map: null,
      drawingManager: null,
      selectedShape: null,
      colors: ["#1E90FF", "#FF1493", "#32CD32", "#FF8C00", "#4B0082"],
      selectedColor: null,
      colorButtons: {},

      scrollInterval: null
    };
    this.googleMapRef = React.createRef();
  }

  componentDidMount() {
    const googleMapScript = document.createElement("script");
    googleMapScript.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBkDqO4ZFc9wLSfg-6qHo5xdAGusxTsRyI&libraries=drawing`;
    window.document.body.appendChild(googleMapScript);

    googleMapScript.addEventListener("load", () => {
      this.initialize();
    });
  }

  clearSelection() {
    if (this.state.selectedShape) {
      if (this.state.selectedShape.type !== "marker") {
        this.state.selectedShape.setEditable(false);
      }
      this.setState({
        selectedShape: null
      });
    }
  }

  setSelection(shape) {
    if (shape.type !== "marker") {
      this.clearSelection.call(this);

      shape.setEditable(true);
      this.selectColor(shape.get("fillColor") || shape.get("strokeColor"));
    }

    this.setState({
      selectedShape: shape
    });
  }

  deleteSelectedShape() {
    if (this.state.selectedShape) {
      this.state.selectedShape.setMap(null);
    }
  }

  selectColor(color) {
    this.setState({
      selectedColor: color
    });

    let polygonOptions = this.state.drawingManager.get("polygonOptions");
    polygonOptions.fillColor = color;
    this.state.drawingManager.set("polygonOptions", polygonOptions);
  }

  setSelectedShapeColor(color) {
    if (this.state.selectedShape) {
      if (
        this.state.selectedShape.type ==
        window.google.maps.drawing.OverlayType.POLYLINE
      ) {
        this.state.selectedShape.set("strokeColor", color);
      } else {
        this.state.selectedShape.set("fillColor", color);
      }
    }
  }

  makeColorButton(color) {
    var button = document.createElement("span");
    button.className = "color-button";
    button.style.backgroundColor = color;
    window.google.maps.event.addDomListener(button, "click", function() {
      this.selectColor(color);
      this.setSelectedShapeColor(color);
    });

    return button;
  }

  initialize() {
    let map = new window.google.maps.Map(this.googleMapRef.current, {
      zoom: 16,
      center: {
        lat: 51.359313,
        lng: 25.499893
      },
      mapTypeId: window.google.maps.MapTypeId.SATELLITE,
      disableDefaultUI: true,
      zoomControl: true
    });

    var polyOptions = {
      strokeWeight: 0,
      fillOpacity: 0.45,
      editable: true,
      draggable: true
    };

    let that = this;

    let drawingManager = new window.google.maps.drawing.DrawingManager({
      drawingMode: window.google.maps.drawing.OverlayType.MARKER,
      drawingControlOptions: {
        position: window.google.maps.ControlPosition.TOP_CENTER,
        drawingModes: ["marker", "polygon", "rectangle"]
      },

      polygonOptions: polyOptions,
      markerOptions: {
        draggable: true,
        icon:
          "https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png"
      }
    });
    drawingManager.setMap(map);

    window.google.maps.event.addListener(
      drawingManager,
      "polygoncomplete",
      polygon => {
        const polyArr = [];
        for (var i = 0; i < polygon.getPath().getLength(); i++) {
          polyArr.push({
            lat: polygon
              .getPath()
              .getAt(i)
              .lat(),
            lng: polygon
              .getPath()
              .getAt(i)
              .lng()
          });
        }
        // FIXME: not customizable at all

        let field = new Field({
          polyArr,
          map,
          // dronePhotoDimentions: {
          //   x: 420,
          //   y: 420
          // },
          dronePhotoDimentions: this.state.drone.dronePhotoDimentions,
          folderPath: folderPath,
          drawSquares: false,
          drawBounds: false
        });
        console.log("polyArr :", polyArr);
        this.setState({
          field
        });

        if (!this.state.labels[this.state.currentLabelIdx + 1]) {
          this.stopDrawing();
          this.setState({
            readyForStart: true
          });
        }
        this.setState(state => {
          return {
            currentLabelIdx: state.currentLabelIdx + 1
          };
        });
      }
    );

    window.google.maps.event.addListener(
      drawingManager,
      "rectanglecomplete",
      rect => {
        let { bounds } = rect;

        let tr = {
            lat: bounds.getNorthEast().lat(),
            lng: bounds.getNorthEast().lng()
          },
          bl = {
            lat: bounds.getSouthWest().lat(),
            lng: bounds.getSouthWest().lng()
          };
        let field = new RectField({
          bounds: {
            tr,
            bl
          }
        });

        this.setState({
          field
        });

        if (!this.state.labels[this.state.currentLabelIdx + 1]) {
          this.stopDrawing();
          this.setState({
            readyForStart: true
          });
        }
        this.setState(state => {
          return {
            currentLabelIdx: state.currentLabelIdx + 1
          };
        });
      }
    );

    window.google.maps.event.addListener(
      drawingManager,
      "markercomplete",
      marker => {
        const pos = {
          lat: marker.getPosition().lat(),
          lng: marker.getPosition().lng()
        };

        this.setState({
          base: pos
        });

        if (!this.state.labels[this.state.currentLabelIdx + 1]) {
          this.stopDrawing();
          this.setState({
            readyForStart: true
          });
        }
        this.setState(state => {
          return {
            currentLabelIdx: state.currentLabelIdx + 1
          };
        });

        this.state.drawingManager.setDrawingMode(
          window.google.maps.drawing.OverlayType.POLYGON
        );

        console.log("Drone :", Drone);
        let droneDim = 200;
        //         25.497646938259912 - 25.498987938259912
        // -0.0013410000000000366

        let droneMaxHeight = 0.000005 * droneDim;
        // let droneMaxHeight = 0.0013410000000000366 ;

        this.state.drone = new Drone(
          {
            position: pos,
            // speed: 0.00004,
            speed: 0.00002,
            overlayRadiusLat: droneMaxHeight / 2,
            overlayRadiusLng:
              droneMaxHeight / 2 / getLngFactor(marker.getPosition().lat()),
            // 0.0002 / Math.cos(marker.getPosition().lat() * 0.01745),
            direction: Math.PI / 2,

            maxHeight: droneMaxHeight,
            // focusDistance: 0.01,
            // sensorA: 0.001,
            // sensorB: 0.05,
            // charge: 10000000,
            // flightCosts: 0,
            // photoCosts: 0,

            batteryCharge: 2000,
            batteryPerPhoto: 20,
            batteryPerMove: 10,
            pushPhoto: this.props.pushPhoto,
            updateDroneParameter: this.props.updateDroneParameter,
            setMapPath: this.props.setMapPath,
            folderPath: folderPath,
            savePhotos: savePhotos,
            dronePhotoDimentions: {
              x: droneDim,
              y: droneDim
            },

            startCallback: () => {
              this.state.scrollInterval = setInterval(() => {
                let el = document.querySelector(".last-shots-container");
                scrollDown(el);
              }, 10);
            },
            endCallback: () => {
              clearInterval(this.state.scrollInterval);
            },

            targetMode: true,
            map: this.state.map,
            icon: {
              url: "https://image.flaticon.com/icons/svg/215/215736.svg",
              scaledSize: new window.google.maps.Size(32, 32)
            }
          },
          window
        );

        // FIXME: not customizable at all
      }
    );

    // TODO: Delete map element
    // window.google.maps.event.addListener(drawingManager, 'overlaycomplete', (event) => {
    //   var element = event.overlay;
    //   window.google.maps.event.addListener(element, 'click', (e) => {
    //     element.setMap(null);
    //   });
    // });

    window.google.maps.event.addListener(
      drawingManager,
      "overlaycomplete",
      e => {
        var newShape = e.overlay;
        newShape.type = e.type;

        if (e.type !== window.google.maps.drawing.OverlayType.MARKER) {
          drawingManager.setDrawingMode(null);
          window.google.maps.event.addListener(newShape, "click", function(e) {
            if (e.vertex !== undefined) {
              if (
                newShape.type === window.google.maps.drawing.OverlayType.POLYGON
              ) {
                var path = newShape.getPaths().getAt(e.path);
                path.removeAt(e.vertex);
                if (path.length < 3) {
                  newShape.setMap(null);
                }
              }
            }
            this.setSelection(newShape);
          });
          this.setSelection(newShape);
        } else {
          window.google.maps.event.addListener(newShape, "click", function(e) {
            this.setSelection(newShape);
          });
          this.setSelection(newShape);
        }
      }
    );

    window.google.maps.event.addListener(
      drawingManager,
      "drawingmode_changed",
      () => this.clearSelection.call(that)
    );

    window.google.maps.event.addListener(map, "click", () =>
      this.clearSelection.call(that)
    );

    this.setState({
      drawingManager: drawingManager,
      map: map
    });
  }

  stopDrawing() {
    this.state.drawingManager.setMap(null);
  }

  addLatLngToPoly(latLng, poly) {
    var path = poly.getPath();
    path.push(latLng);
    var encodeString = window.google.maps.geometry.encoding.encodePath(path);
    // if (encodeString) {
    //   document.getElementById('encoded-polyline').value = encodeString;
    // }
  }

  async startFlight() {
    if (savePhotos) {
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
      }

      fs.writeFile("flight_number.txt", parseInt(flightNumber) + 1, function() {
        console.log("done");
      });
    }

    let that = this;
    this.state.drone.setField(this.state.field);
    this.state.drone.setBase(this.state.base);
    let target = this.state.drone.mapToCenter(
      this.state.drone.findClosestPoint(this.state.field.bounds.toArray())
    );

    // MainCalculation()

    let { field, drone, base } = this.state;
    field.setRadiuses(drone.overlayRadiusLat, drone.overlayRadiusLng);
    field.distributeOnSquares();
    await field.createMap();
    this.state.drone.setField(field);
    console.log("FIELD :", field);

    // MAP REDUX
    // const logoPath = '/path/to/my/image.png';

    // const logo = fs.readFileSync(logoPath).toString('base64');
    // this.props.setMapPath(field.photosMap.path);
    console.log("field.photosMap.mapImg :", field.photosMap.mapImg);

    console.log("field :", field.squaresArray);
    const composedPath = [];
    let composedPathBack;

    console.log("field.SquaresArray :", field.SquaresArray);
    for (let [y, p] of field.squaresArray.entries()) {
      if (y % 2 !== 0) {
        // p = p.reverse();
        // let copiedP = p.reverse();
        // for(let i = 0; i < arrr.length; i++) {
        //   composedArr.push({ p: arrReversed[i].p, ...arrr[i]})
        // }
      }
      console.log("p :", p);

      for (let [x, pp] of p.entries()) {
        let vpp = drone.mapToCenter(mapToVector(pp.bounds.center));
        let rect = Rectangle.newFromCenter(
          vectorToMap(vpp),
          drone.overlayRadiusLat,
          drone.overlayRadiusLng
        );
        console.log("x, y :", x, y);
        const isInside = field.isRectInside(rect);

        if (isInside) {
          let pathNode = {
            point: vpp,
            xn: x,
            yn: y,
            type: "MAKE_PHOTO"
          };
          drone.addToPath(pathNode);
          composedPath.push(pathNode);

          let mark = new window.google.maps.Marker({
            position: {
              lat: vpp.getX(),
              lng: vpp.getY()
            },
            map: this.state.map
          });
        }
      }
    }

    console.log("mapToVector(this.state.base) :", mapToVector(this.state.base));
    drone.addToPath({
      point: mapToVector(this.state.base),
      type: "BASE"
    });

    this.update.call(that);
  }

  update() {
    this.state.drone.update();
    if (!this.state.drone.finishedFlight) {
      setTimeout(() => {
        this.update.call(this);
      }, 1);
    }
    // requestAnimationFrame(this.update.call(this));
  }

  render() {
    const { labels, currentLabelIdx, readyForStart } = this.state;
    let that = this;
    return (
      <div className="relative">
        <div
          id="help-container"
          style={{ display: labels[currentLabelIdx] ? "flex" : "none" }}
        >
          {labels[currentLabelIdx]}
        </div>

        <button
          onClick={() => this.startFlight.call(that)}
          className="start-flight-button click-scale-down bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full"
          style={{ display: readyForStart ? "block" : "none" }}
        >
          Start
        </button>

        <div
          ref={this.googleMapRef}
          id="google-map"
          className="card-panel white map-holder"
        ></div>

        <div className="last-shots-container">
          {this.props.photos.length > 0 &&
            this.props.photos.map((f, idx) => (
              <div
                className={`appear-anim photo-gallery-item  ${this.state
                  .expandedIdx === idx && "photo-gallery-item-expanded"}`}
                key={Math.random() * Math.random()}
                // key={f.url + Math.random() * Math.random()}
              >
                <div
                  className="photo-expand-button icon-wrapper click-scale-down text-white"
                  onClick={() => this.expandPhoto(idx)}
                >
                  <FontAwesomeIcon
                    icon={faExpandArrowsAlt}
                    onClick={this.toggleTopBottom}
                  />
                </div>
                <img src={f.url} />
              </div>
            ))}
        </div>
      </div>
    );
  }
}

let mapDispatchToProps = dispatch => {
  return {
    pushPhoto: photo => dispatch(pushPhoto(photo)),
    setMapPath: mapPath => dispatch(setMapPath(mapPath)),
    updateDroneParameter: (name, val) =>
      dispatch(updateDroneParameter(name, val))
  };
};

let mapStateToProps = state => {
  console.log("SHIT STATE :", state);
  return {
    photos: state.photosData.photos,
    settings: state.settings
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MyMap);
