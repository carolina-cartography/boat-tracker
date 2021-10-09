const SerialPort = require('serialport')
const AisDecoder = require('ggencoder').AisDecode

// Setup serial reader
let serialPort = new SerialPort(process.env.SERIAL_PORT, {
    baudRate: 38400
})

// Listen to serial reader
serialPort.on('data', (buffer) => {
    var decoded = new AisDecoder(buffer.toString())
    if (decoded.valid) console.log ('%j', decoded)
})
serialPort.on('error', (err) => {
    console.error(err)
})