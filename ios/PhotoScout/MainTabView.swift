//
//  MainTabView.swift
//  PhotoScout
//
//  Main tab bar navigation
//

import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            ChatTab()
                .tabItem {
                    Label("Chat", systemImage: "message.fill")
                }

            PlansTab()
                .tabItem {
                    Label("Trips", systemImage: "map.fill")
                }

            HistoryTab()
                .tabItem {
                    Label("History", systemImage: "clock.fill")
                }

            SettingsTab()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
        }
        .tint(.blue)
    }
}

#Preview {
    MainTabView()
}
