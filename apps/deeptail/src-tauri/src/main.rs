// Desktop binary. The mobile targets link the library's entry point instead.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    deeptail_lib::run();
}
