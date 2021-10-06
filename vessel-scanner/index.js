const SerialPort = require('serialport')
const AisDecoder = require('ais-stream-decoder')

// Setup decoder
const aisDecoder = new AisDecoder.default()
aisDecoder.on('error', (error) => {
    console.log(error)
})
aisDecoder.on('data', (decoded) => {
    console.log(decoded)
})

// Setup serial reader
let serialPort = new SerialPort(process.env.SERIAL_PORT, {
    baudRate: 38400
})

// Listen to serial reader
serialPort.on('data', function (buffer) {
    console.log(buffer.toString())
    aisDecoder.write(buffer.toString())
})