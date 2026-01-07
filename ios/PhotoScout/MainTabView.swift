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
                    Label("Plans", systemImage: "map.fill")
                }

            HistoryTab()
                .tabItem {
                    Label("History", systemImage: "clock.fill")
                }
        }
        .accentColor(.blue)
    }
}

#Preview {
    MainTabView()
}
