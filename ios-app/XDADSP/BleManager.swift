import Foundation
import CoreBluetooth
import Combine

final class BleManager: NSObject, ObservableObject {
    @Published var status = "Idle"
    @Published var devices: [CBPeripheral] = []
    @Published var connectedName: String?
    @Published var lastError: String?
    @Published var scanning = false
    @Published var ready = false

    private var central: CBCentralManager!
    private var peripheral: CBPeripheral?
    private var writeChar: CBCharacteristic?
    private var queue: [Data] = []
    private var writing = false

    override init() {
        super.init()
        central = CBCentralManager(delegate: self, queue: .main)
    }

    func scan() {
        devices = []
        lastError = nil
        guard central.state == .poweredOn else {
            status = "Turn on Bluetooth"
            return
        }
        scanning = true
        status = "Scanning…"
        central.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
        DispatchQueue.main.asyncAfter(deadline: .now() + 8) { [weak self] in
            guard let self, self.scanning else { return }
            self.central.stopScan()
            self.scanning = false
            if self.devices.isEmpty { self.status = "No Jensen amps found" }
            else { self.status = "Select an amp" }
        }
    }

    func connect(_ p: CBPeripheral) {
        central.stopScan()
        scanning = false
        status = "Connecting…"
        peripheral = p
        p.delegate = self
        central.connect(p, options: nil)
    }

    func disconnect() {
        if let p = peripheral { central.cancelPeripheralConnection(p) }
        writeChar = nil
        peripheral = nil
        ready = false
        connectedName = nil
        status = "Disconnected"
    }

    func sync(_ dsp: DSPState) {
        guard ready else { return }
        JLBT.resetSeq()
        var frames: [Data] = [
            JLBT.queryVersion(),
            JLBT.queryFirmware(),
            JLBT.volume(master: Int(dsp.master), muted: dsp.muted),
            JLBT.eqGains(dsp.eq.map { Int($0.rounded()) }),
            JLBT.channelSelect(1),
            JLBT.filter(mode: dsp.xoverMode, slope: dsp.slope, freq: Int(dsp.xoverFreq)),
            JLBT.bassBoost(dsp.bassBoost),
            JLBT.rgb(mode: dsp.rgbMode, hue: dsp.hue, sat: dsp.sat, brightness: dsp.brightness),
        ]
        for f in frames { enqueue(f) }
    }

    private func enqueue(_ data: Data) {
        queue.append(data)
        flush()
    }

    private func flush() {
        guard !writing, let p = peripheral, let c = writeChar, let next = queue.first else { return }
        writing = true
        let type: CBCharacteristicWriteType = c.properties.contains(.writeWithoutResponse) ? .withoutResponse : .withResponse
        p.writeValue(next, for: c, type: type)
        queue.removeFirst()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
            self?.writing = false
            self?.flush()
        }
    }
}

extension BleManager: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn: status = "Bluetooth on — scan for amp"
        case .poweredOff: status = "Bluetooth is off"
        case .unauthorized: status = "Allow Bluetooth in Settings"
        default: status = "Bluetooth unavailable"
        }
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral,
                        advertisementData: [String: Any], rssi RSSI: NSNumber) {
        let name = (peripheral.name ?? advertisementData[CBAdvertisementDataLocalNameKey] as? String ?? "").uppercased()
        let prefixes = ["XDA", "JA", "JENSEN", "BOA", "DSP", "OCTANE"]
        if !name.isEmpty && !prefixes.contains(where: { name.hasPrefix($0) }) && !name.contains("JENSEN") {
            // still keep Heart Rate advertisers — Jensen modules hide as 180D
        }
        if !devices.contains(where: { $0.identifier == peripheral.identifier }) {
            devices.append(peripheral)
            status = "Found \(devices.count) device(s)"
        }
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        status = "Discovering…"
        connectedName = peripheral.name ?? "Jensen Amp"
        peripheral.discoverServices([CBUUID(string: CBUUIDCompat.ae00)])
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        status = "Connect failed"
        lastError = error?.localizedDescription
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        ready = false
        writeChar = nil
        status = "Disconnected"
    }
}

extension BleManager: CBPeripheralDelegate {
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard let services = peripheral.services else {
            status = "No AE00 service"
            return
        }
        for s in services { peripheral.discoverCharacteristics(nil, for: s) }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        for c in service.characteristics ?? [] {
            let u = c.uuid.uuidString.uppercased()
            if u.contains(CBUUIDCompat.ae01) { writeChar = c }
            if u.contains(CBUUIDCompat.ae02) { peripheral.setNotifyValue(true, for: c) }
        }
        if writeChar != nil {
            ready = true
            status = "Linked — \(connectedName ?? "amp")"
        } else {
            status = "No AE01 write characteristic"
        }
    }
}
