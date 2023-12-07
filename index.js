const fs = require('fs');
const path = require('path');
const FitParser = require('fit-file-parser').default;

const inputPath = './src/IN';
const outputPath = './src/OUT';

const directoryInputPath = path.join(__dirname, inputPath);
const directoryOutputPath = path.join(__dirname, outputPath);

const millisecondInSecond = 1000;

const parse = (fileName) => {
  console.clear();

  const file = `${inputPath}/` + fileName;
  const fileNameWithoutExtension = fileName.replace('.fit', '');

  if (!file) return;

  fs.readFile(file, function (err, content) {
    const fitParser = new FitParser({
      force: true,
      speedUnit: 'km/h',
      lengthUnit: 'm',
      temperatureUnit: 'celsius',
      elapsedRecordField: true,
      mode: 'list',
    });

    fitParser?.parse(content, async (error, data) => {
      if (error) {
        console.log(error);
      } else {
        let newData = [];

        const records = data['records'];
        const sport = data['sessions'][0]?.sport || 'Other';
        const sportType = sport.includes('cycling') ? 'Biking' : sport.includes('running') ? 'Running' : 'Other';

        for (let index = 0; index < records.length; index++) {
          const diff = (records[index]?.timestamp || 0) - (records[index - 1]?.timestamp || 0);
          const hole = diff !== millisecondInSecond;

          if (!hole || index === 0) {
            newData.push(records[index]);
          } else {
            let sequence = [records[index - 1]];

            const steps = Math.floor(diff / millisecondInSecond);
            const distanceStart = records[index - 1].distance;
            const distanceEnd = records[index].distance;

            const distanceStep = (distanceEnd - distanceStart) / steps;

            for (let o = 1; o < steps; o++) {
              sequence.push({
                ...records[index],
                elapsed_time: records[index - 1].elapsed_time + o,
                timer_time: records[index - 1].timer_time + o,
                distance: Number((records[index - 1]?.distance + o * distanceStep)?.toFixed(2)),
              });
            }

            sequence.push(records[index]);
            newData.push(...sequence);
          }
        }

        let total_timer_time = 0;
        let total_distance = 0;
        let avg_heart_rate = 0;
        let max_heart_rate = 0;
        let max_speed = 0;
        let avg_cadence = 0;
        let trackPoints = '';
        let id = null;

        newData.forEach(
          ({
            power,
            distance,
            cadence,
            speed: enhanced_speed,
            heart_rate,
            timestamp,
            position_lat,
            position_long,
            elapsed_time,
            altitude,
          }) => {
            const altitudeMeters = altitude ? Number(altitude) : null;
            const distanceMeters = distance ? Number(distance) : null;
            const powerWatts = power ? Number(power.toFixed(2)) : null;
            const cadenceRotation = cadence ? Number(cadence.toFixed(2)) : null;
            const speed = enhanced_speed ? Number(enhanced_speed) : null;
            const hr = heart_rate ? Number(heart_rate.toFixed(2)) : heart_rate;
            const time = timestamp?.toISOString() || new Date().toISOString();

            if (!id) id = time;
            if (total_timer_time < elapsed_time) total_timer_time = elapsed_time;
            if (total_distance < distance) total_distance = distance;
            if (max_heart_rate < heart_rate) max_heart_rate = heart_rate;
            if (max_speed < enhanced_speed) max_speed = enhanced_speed;
            avg_heart_rate = (avg_heart_rate + heart_rate) / 2;
            if (cadence !== 0) avg_cadence = (avg_cadence + cadence) / 2;

            const trackPoint = {
              ...(position_lat && { latitude: position_lat }),
              ...(position_long && { longitude: position_long }),
              ...(altitudeMeters && { altitude: altitudeMeters }),
              ...(distanceMeters && { distance: distanceMeters }),
              ...(powerWatts && { power: powerWatts }),
              ...(cadenceRotation && { cadence: cadenceRotation }),
              ...(speed && { speed: speed }),
              ...(hr && { hr: hr }),
              time: time,
            };

            let tpString = `<Trackpoint>`;

            if (time) tpString += `<Time>${time}</Time>`;

            if (position_lat && position_long) {
              tpString += `<Position><LatitudeDegrees>${trackPoint.latitude}</LatitudeDegrees><LongitudeDegrees>${trackPoint.longitude}</LongitudeDegrees></Position>`;
            }

            if (altitudeMeters) tpString += `<AltitudeMeters>${altitudeMeters}</AltitudeMeters>`;
            if (distanceMeters) tpString += `<DistanceMeters>${distanceMeters}</DistanceMeters>`;
            if (hr) tpString += `<HeartRateBpm><Value>${hr}</Value></HeartRateBpm>`;
            if (cadenceRotation) tpString += `<Cadence>${cadenceRotation}</Cadence>`;

            if (speed || powerWatts) {
              let extension = '<Extensions><ns3:TPX>';

              if (speed) extension += `<ns3:Speed>${speed}</ns3:Speed>`;
              if (powerWatts) extension += `<ns3:Watts>${powerWatts}</ns3:Watts>`;

              extension += '</ns3:TPX></Extensions>';
              tpString += extension;
            }

            tpString += '</Trackpoint>';

            trackPoints += tpString;
          },
        );

        const result =
          '<?xml version="1.0" encoding="utf-8"?>' +
          '<TrainingCenterDatabase xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 https://www8.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd" xmlns:ns5="http://www.garmin.com/xmlschemas/ActivityGoals/v1" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2" xmlns:ns2="http://www.garmin.com/xmlschemas/UserProfile/v2" xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ns4="http://www.garmin.com/xmlschemas/ProfileExtension/v1" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
          '<Activities>' +
          `<Activity Sport="${sportType}">` +
          `<Id>${id}</Id>` +
          `<Lap StartTime ="${id}">` +
          `<TotalTimeSeconds>${total_timer_time}</TotalTimeSeconds>` +
          `<DistanceMeters>${total_distance}</DistanceMeters>` +
          `<MaximumSpeed>${max_speed}</MaximumSpeed>` +
          `<Calories>${500}</Calories>` +
          '<AverageHeartRateBpm>' +
          `<Value>${Number(avg_heart_rate).toFixed(0)}</Value>` +
          '</AverageHeartRateBpm>' +
          '<MaximumHeartRateBpm>' +
          `<Value>${max_heart_rate}</Value>` +
          '</MaximumHeartRateBpm>' +
          '<Intensity>Active</Intensity>' +
          `<Cadence>${Number(avg_cadence).toFixed(0)}</Cadence>` +
          '<TriggerMethod>Time</TriggerMethod>' +
          `<Track> ${trackPoints}</Track>`.replace(/\s/g, '') +
          '</Lap>' +
          '</Activity>' +
          '</Activities>' +
          '</TrainingCenterDatabase>';

        fs.writeFileSync(`./${outputPath}/${fileNameWithoutExtension}.tcx`, result);
      }
    });
  });
};

// processing .fit files
fs.readdir(directoryInputPath, async (err, files) => {
  if (err) {
    return console.log('Unable to scan directory: ' + err);
  }

  try {
    // remove old files from OUT dir
    await fs.readdir(directoryOutputPath, async (err, files) => {
      if (err) throw err;

      for (const file of files) {
        await fs.unlink(path.join(directoryOutputPath, file), (err) => {
          if (err) throw err;
        });
      }
    });
  } catch (error) {
    console.log('🚀 ~ error:', error);
  }

  try {
    files.forEach((file) => {
      if (!file.includes('.fit')) return;
      parse(file);
    });
  } catch (error) {
    console.log('🚀 ~ error:', error);
  }
});
