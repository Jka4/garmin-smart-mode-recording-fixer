var fs = require('fs');
const path = require('path');

const addTrackPoint = require('./src/utils/tcxWriter.js').addTrackPoint;
const writeTcx = require('./src/utils/tcxWriter.js').writeTcx;
const Clean = require('./src/utils/tcxWriter.js').Clean;
var FitParser = require('./src/utils/fit-parser.js').default;

const inputPath = './src/IN';
const outputPath = './src/OUT';

const directoryPath = path.join(__dirname, inputPath);

const parse = (fileName) => {
  const file = `${inputPath}/` + fileName;
  const fileNameWithoutExtension = fileName.replace('.fit', '');

  if (!file) return;

  fs.readFile(file, function (err, content) {
    var fitParser = new FitParser({
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
        const records = data['records'];
        const sessions = data['activity'];

        let newData = [];

        for (let index = 0; index < records.length; index++) {
          const diff = (records[index]?.timestamp || 0) - (records[index - 1]?.timestamp || 0);
          const hole = diff !== 1000;

          if (!hole || index === 0) {
            newData.push(records[index]);
          } else {
            let sequence = [records[index - 1]];

            const steps = Math.floor(diff / 1000);
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

        newData.forEach(
          ({
            power,
            distance,
            cadence,
            enhanced_speed,
            heart_rate,
            timestamp,
            position_lat,
            position_long,
            elapsed_time,
            enhanced_altitude,
          }) => {
            const trackPoint = {
              ...(position_lat && { latitude: position_lat }),
              ...(position_long && { longitude: position_long }),

              altitude: Number((enhanced_altitude || 1).toFixed(2)),
              elapsed_time: elapsed_time || 1,
              distance: Number((distance || 1).toFixed(2)),
              power: Number((power || 1).toFixed(2)),
              cadence: Number((cadence || 1).toFixed(2)),
              speed: Number((enhanced_speed || 1).toFixed(2)),
              hr: Number((heart_rate || 1).toFixed(2)),

              time: timestamp?.toISOString() || new Date().toISOString(),
            };

            addTrackPoint(trackPoint);
          },
        );

        let result = writeTcx(sessions);

        fs.writeFileSync(`./${outputPath}/${fileNameWithoutExtension}.tcx`, result);

        console.count();

        newData = [];
        Clean();
        result = '';
      }
    });
  });
};

fs.readdir(directoryPath, (err, files) => {
  if (err) {
    return console.log('Unable to scan directory: ' + err);
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
