import Foundation

enum JLBT {
    static let magic: [UInt8] = [0x4A, 0x4C, 0x42, 0x54]
    static let hwEqFreqs = [63, 240, 1000, 6500, 12000]
    static let ae00 = CBUUIDCompat.ae00
    static let ae01 = CBUUIDCompat.ae01
    static let ae02 = CBUUIDCompat.ae02
    static let heartRate = CBUUIDCompat.heartRate

    private static var seq: UInt32 = 1

    static func resetSeq() { seq = 1 }

    static func frame(_ payload: [UInt8]) -> Data {
        let n = seq
        seq &+= 1
        var pkt = [UInt8](repeating: 0, count: 15 + payload.count)
        pkt[0] = 0x4A; pkt[1] = 0x4C; pkt[2] = 0x42; pkt[3] = 0x54
        pkt[4] = UInt8((n >> 24) & 255)
        pkt[5] = UInt8((n >> 16) & 255)
        pkt[6] = UInt8((n >> 8) & 255)
        pkt[7] = UInt8(n & 255)
        pkt[13] = 1
        pkt[14] = UInt8(payload.count & 255)
        for (i, b) in payload.enumerated() { pkt[15 + i] = b }
        return Data(pkt)
    }

    static func queryVersion() -> Data { frame([0x80]) }
    static func queryFirmware() -> Data { frame([0x90]) }
    static func queryModeNum() -> Data { frame([0x85]) }

    static func volume(master: Int, muted: Bool) -> Data {
        var m = UInt8(max(0, min(40, master)) & 127)
        if muted { m |= 128 }
        var p = [UInt8](repeating: 0, count: 8)
        p[0] = 0x83
        p[1] = m
        p[2] = m
        p[3] = m
        return frame(p)
    }

    static func channelSelect(_ ch: UInt8) -> Data { frame([0x8C, ch]) }

    static func filter(mode: String, slope: Int, freq: Int) -> Data {
        var type: UInt8 = 0
        if mode == "hpf" {
            type = slope >= 18 ? 1 : (slope >= 12 ? 2 : 3)
        } else if mode == "lpf" {
            type = slope >= 18 ? 4 : (slope >= 12 ? 5 : 6)
        }
        let f = mode == "full" ? 20 : max(20, min(20000, freq))
        return frame([0x8B, type, UInt8((f >> 8) & 255), UInt8(f & 255)])
    }

    static func bassBoost(_ on: Bool) -> Data { frame([0x88, 4, on ? 1 : 0]) }

    static func eqGains(_ gains: [Int]) -> Data {
        var p = [UInt8](repeating: 0, count: 15)
        p[0] = 0x88
        p[1] = 1
        p[2] = 32 | 128
        let freqs = hwEqFreqs
        for i in 0..<3 {
            let g = max(-9, min(9, gains.indices.contains(i) ? gains[i] : 0))
            let packed = abs(g) | (g < 0 ? 16 : 0)
            let freq = freqs[i]
            p[3 + i * 2] = UInt8(((packed << 3) & 255) | ((freq >> 8) & 255))
            p[4 + i * 2] = UInt8(freq & 255)
        }
        for i in 3..<5 {
            let g = max(-9, min(9, gains.indices.contains(i) ? gains[i] : 0))
            let off = i == 3 ? 9 : 12
            p[off] = g >= 0 ? UInt8(g) : UInt8((abs(g) & 127) | 128)
            let freq = freqs[i]
            p[off + 1] = UInt8((freq >> 8) & 255)
            p[off + 2] = UInt8(freq & 255)
        }
        return frame(p)
    }

    static func rgb(mode: String, hue: Double, sat: Double, brightness: Double) -> Data {
        let on = mode != "off"
        var flags: UInt8 = on ? 1 : 0
        if mode == "cycle" { flags |= 4 }
        if mode == "breathe" { flags |= 128 }
        let rgb = hslToRgb(h: hue, s: sat)
        let br = max(0, min(1, brightness / 100))
        return frame([
            0x89,
            flags,
            UInt8(Double(rgb.0) * br),
            UInt8(Double(rgb.1) * br),
            UInt8(Double(rgb.2) * br),
        ])
    }

    private static func hslToRgb(h: Double, s: Double) -> (Int, Int, Int) {
        let sat = s / 100
        let light = 0.5
        let a = sat * min(light, 1 - light)
        func f(_ n: Double) -> Int {
            let k = (n + h / 30).truncatingRemainder(dividingBy: 12)
            let val = light - a * max(min(min(k - 3, 9 - k), 1), -1)
            return max(0, min(255, Int((val * 255).rounded())))
        }
        return (f(0), f(8), f(4))
    }
}

enum CBUUIDCompat {
    static let heartRate = "180D"
    static let ae00 = "AE00"
    static let ae01 = "AE01"
    static let ae02 = "AE02"
}
