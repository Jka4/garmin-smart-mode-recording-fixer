'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});

let trackPoints = [];

const addTrackPoint = (trackPoint) => {
  trackPoints.push(trackPoint);
};

const writeTcx = (sessions) => {
  const trackPointReducer = (accumulator, trackPoint) => {
    const tpString = `<Trackpoint>
  				<Time>${trackPoint.time}</Time>
  				${
            trackPoint.latitude
              ? `<Position>
              <LatitudeDegrees>${trackPoint.latitude}</LatitudeDegrees>
              <LongitudeDegrees>${trackPoint.longitude}</LongitudeDegrees>
          </Position>`
              : ''
          }
					<AltitudeMeters>${trackPoint.altitude}</AltitudeMeters>
  				<DistanceMeters>${trackPoint.distance}</DistanceMeters>
  				<HeartRateBpm><Value>${trackPoint.hr}</Value></HeartRateBpm>
  				<Cadence>${trackPoint.cadence} </Cadence>
  				<Extensions>
  						<ns3:TPX>
  							<ns3:Speed>${trackPoint.speed}</ns3:Speed>
  							<ns3:Watts>${trackPoint.power}</ns3:Watts>
  						</ns3:TPX>
  				</Extensions>
  			</Trackpoint>`;
    return accumulator + tpString;
  };

  const trackPointsElement = trackPoints.reduce(trackPointReducer, '');

  const {
    total_timer_time = 1,
    total_distance = 1,
    total_calories = 1,
    total_ascent = 1,
    total_descent = 1,
    avg_heart_rate = 1,
    max_heart_rate = 1,
    enhanced_avg_speed = 1,
    enhanced_max_speed = 1,
    avg_cadence = 1,
  } = sessions || {};

  const trackElement = '<Track>' + trackPointsElement + '</Track>';
  const lapElement =
    `<Lap StartTime ="${trackPoints[0]?.time}">` +
    `<TotalTimeSeconds>${total_timer_time}</TotalTimeSeconds>` +
    `<DistanceMeters>${total_distance}</DistanceMeters>` +
    `<MaximumSpeed>${enhanced_max_speed}</MaximumSpeed>` +
    `<Calories>${total_calories}</Calories>` +
    '<AverageHeartRateBpm>' +
    `<Value>${avg_heart_rate}</Value>` +
    '</AverageHeartRateBpm>' +
    '<MaximumHeartRateBpm>' +
    `<Value>${max_heart_rate}</Value>` +
    '</MaximumHeartRateBpm>' +
    '<Intensity>Active</Intensity>' +
    `<Cadence>${avg_cadence}</Cadence>` +
    '<TriggerMethod>Time</TriggerMethod>' +
    trackElement +
    '</Lap>';

  const ActivitiesElement =
    '<Activities>' +
    '<Activity Sport="Biking">' +
    `<Id>${trackPoints[0]?.time}</Id>` +
    lapElement +
    '</Activity>' +
    '</Activities>';

  const tcxElement =
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<TrainingCenterDatabase xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 https://www8.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd" xmlns:ns5="http://www.garmin.com/xmlschemas/ActivityGoals/v1" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2" xmlns:ns2="http://www.garmin.com/xmlschemas/UserProfile/v2" xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ns4="http://www.garmin.com/xmlschemas/ProfileExtension/v1" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
    ActivitiesElement +
    '</TrainingCenterDatabase>';

  return tcxElement;
};

const Clean = () => {
  trackPoints = [];
};

exports.addTrackPoint = addTrackPoint;
exports.writeTcx = writeTcx;
exports.Clean = Clean;
