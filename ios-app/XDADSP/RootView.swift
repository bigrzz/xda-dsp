import SwiftUI
import CoreBluetooth

struct RootView: View {
    @EnvironmentObject var ble: BleManager
    @EnvironmentObject var dsp: DSPState
    @State private var tab = 0

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("XDA DSP")
                        .font(.title2.weight(.heavy))
                        .foregroundStyle(Color(red: 1, green: 0.45, blue: 0.1))
                    Text(ble.status)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.55))
                }
                Spacer()
                Circle()
                    .fill(ble.ready ? Color.green : Color.white.opacity(0.2))
                    .frame(width: 10, height: 10)
            }
            .padding(.horizontal, 20)
            .padding(.top, 14)
            .padding(.bottom, 8)

            TabView(selection: $tab) {
                HomeTab().tag(0)
                EQTab().tag(1)
                XoverTab().tag(2)
                LightTab().tag(3)
                ConnectTab().tag(4)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            HStack {
                tabBtn(0, "Home")
                tabBtn(1, "EQ")
                tabBtn(2, "Xover")
                tabBtn(3, "Light")
                tabBtn(4, "Link")
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 10)
            .background(Color.black.opacity(0.4))
        }
        .background(Color(red: 0.07, green: 0.07, blue: 0.08).ignoresSafeArea())
        .onChange(of: dsp.master) { _ in ble.sync(dsp) }
        .onChange(of: dsp.muted) { _ in ble.sync(dsp) }
        .onChange(of: dsp.eq) { _ in ble.sync(dsp) }
        .onChange(of: dsp.xoverMode) { _ in ble.sync(dsp) }
        .onChange(of: dsp.xoverFreq) { _ in ble.sync(dsp) }
        .onChange(of: dsp.slope) { _ in ble.sync(dsp) }
        .onChange(of: dsp.bassBoost) { _ in ble.sync(dsp) }
        .onChange(of: dsp.rgbMode) { _ in ble.sync(dsp) }
        .onChange(of: dsp.hue) { _ in ble.sync(dsp) }
        .onChange(of: dsp.sat) { _ in ble.sync(dsp) }
        .onChange(of: dsp.brightness) { _ in ble.sync(dsp) }
    }

    func tabBtn(_ i: Int, _ title: String) -> some View {
        Button {
            tab = i
        } label: {
            Text(title)
                .font(.caption.weight(.semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .foregroundStyle(tab == i ? Color(red: 1, green: 0.45, blue: 0.1) : .white.opacity(0.5))
        }
    }
}

struct HomeTab: View {
    @EnvironmentObject var dsp: DSPState
    var body: some View {
        VStack(spacing: 18) {
            Text("MASTER").font(.caption).foregroundStyle(.white.opacity(0.4))
            Text("\(Int(dsp.master))")
                .font(.system(size: 64, weight: .bold, design: .rounded))
            Slider(value: $dsp.master, in: 0...40, step: 1)
                .tint(Color(red: 1, green: 0.45, blue: 0.1))
            Toggle("Mute", isOn: $dsp.muted)
            Spacer()
        }
        .padding(24)
    }
}

struct EQTab: View {
    @EnvironmentObject var dsp: DSPState
    var body: some View {
        VStack {
            Text("5-BAND GRAPHIC").font(.caption).foregroundStyle(.white.opacity(0.4))
            HStack(alignment: .bottom, spacing: 12) {
                ForEach(0..<5, id: \.self) { i in
                    VStack {
                        Text(String(format: "%+.0f", dsp.eq[i]))
                            .font(.caption2.monospacedDigit())
                        Slider(value: Binding(
                            get: { dsp.eq[i] },
                            set: { dsp.eq[i] = $0 }
                        ), in: -9...9, step: 1)
                        .rotationEffect(.degrees(-90))
                        .frame(width: 140, height: 28)
                        Text(dsp.eqLabels[i]).font(.caption2)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .frame(height: 200)
            Button("Flat") { dsp.eq = [0, 0, 0, 0, 0] }
                .foregroundStyle(Color(red: 1, green: 0.45, blue: 0.1))
            Spacer()
        }
        .padding(20)
    }
}

struct XoverTab: View {
    @EnvironmentObject var dsp: DSPState
    var body: some View {
        Form {
            Picker("Mode", selection: $dsp.xoverMode) {
                Text("HPF").tag("hpf")
                Text("LPF").tag("lpf")
                Text("Full").tag("full")
            }
            .pickerStyle(.segmented)
            if dsp.xoverMode != "full" {
                Stepper("Freq \(Int(dsp.xoverFreq)) Hz", value: $dsp.xoverFreq, in: 20...20000, step: 10)
                Picker("Slope", selection: $dsp.slope) {
                    Text("6 dB").tag(6)
                    Text("12 dB").tag(12)
                    Text("18 dB").tag(18)
                }
            }
            Toggle("Bass boost", isOn: $dsp.bassBoost)
        }
        .scrollContentBackground(.hidden)
    }
}

struct LightTab: View {
    @EnvironmentObject var dsp: DSPState
    var body: some View {
        Form {
            Picker("Mode", selection: $dsp.rgbMode) {
                Text("Off").tag("off")
                Text("Solid").tag("solid")
                Text("Cycle").tag("cycle")
                Text("Breathe").tag("breathe")
            }
            .pickerStyle(.segmented)
            Slider(value: $dsp.hue, in: 0...360) { Text("Hue") }
            Slider(value: $dsp.sat, in: 0...100) { Text("Sat") }
            Slider(value: $dsp.brightness, in: 10...100) { Text("Bright") }
        }
        .scrollContentBackground(.hidden)
    }
}

struct ConnectTab: View {
    @EnvironmentObject var ble: BleManager
    @EnvironmentObject var dsp: DSPState
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button(ble.scanning ? "Scanning…" : "Scan for Jensen amp") {
                ble.scan()
            }
            .buttonStyle(.borderedProminent)
            .tint(Color(red: 1, green: 0.45, blue: 0.1))
            .disabled(ble.scanning)

            if ble.ready {
                Button("Disconnect") { ble.disconnect() }
                Button("Push settings to amp") { ble.sync(dsp) }
            }

            List(ble.devices, id: \.identifier) { p in
                Button {
                    ble.connect(p)
                } label: {
                    VStack(alignment: .leading) {
                        Text(p.name ?? "Unknown amp").foregroundStyle(.white)
                        Text(p.identifier.uuidString).font(.caption2).foregroundStyle(.gray)
                    }
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)

            if let err = ble.lastError {
                Text(err).font(.caption).foregroundStyle(.red)
            }
            Text("PIN if asked: 0000 or 1234")
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.4))
        }
        .padding(16)
    }
}
