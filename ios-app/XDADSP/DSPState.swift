import Foundation
import Combine

final class DSPState: ObservableObject {
    @Published var master: Double = 24
    @Published var muted = false
    @Published var eq: [Double] = [0, 0, 0, 0, 0]
    @Published var xoverMode = "hpf"
    @Published var xoverFreq: Double = 80
    @Published var slope: Int = 12
    @Published var bassBoost = false
    @Published var rgbMode = "solid"
    @Published var hue: Double = 12
    @Published var sat: Double = 90
    @Published var brightness: Double = 70

    let eqLabels = ["63", "240", "1k", "6.5k", "12k"]
}
