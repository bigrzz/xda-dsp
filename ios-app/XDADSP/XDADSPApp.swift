import SwiftUI

@main
struct XDADSPApp: App {
    @StateObject private var ble = BleManager()
    @StateObject private var dsp = DSPState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(ble)
                .environmentObject(dsp)
                .preferredColorScheme(.dark)
        }
    }
}
