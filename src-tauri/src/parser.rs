use regex::Regex;
use serde::{Deserialize, Serialize};
use once_cell::sync::Lazy;

/// Log level enum matching Android's log levels
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LogLevel {
    V, // Verbose
    D, // Debug
    I, // Info
    W, // Warn
    E, // Error
    A, // Assert
}

impl LogLevel {
    pub fn from_char(c: char) -> Option<LogLevel> {
        match c {
            'V' => Some(LogLevel::V),
            'D' => Some(LogLevel::D),
            'I' => Some(LogLevel::I),
            'W' => Some(LogLevel::W),
            'E' => Some(LogLevel::E),
            'A' | 'F' => Some(LogLevel::A), // F (Fatal) maps to Assert
            _ => None,
        }
    }
}

/// A single log entry parsed from logcat output
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: u64,
    #[serde(rename = "deviceId", skip_serializing_if = "Option::is_none")]
    pub device_id: Option<String>,
    pub timestamp: String,
    #[serde(rename = "dateTime", skip_serializing_if = "Option::is_none")]
    pub date_time: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub epoch: Option<u64>,
    pub pid: u32,
    pub tid: u32,
    pub level: LogLevel,
    pub tag: String,
    pub message: String,
    #[serde(rename = "packageName", skip_serializing_if = "Option::is_none")]
    pub package_name: Option<String>,
    #[serde(rename = "processName", skip_serializing_if = "Option::is_none")]
    pub process_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw: Option<String>,
}

/// Regex patterns for parsing logcat output
/// Format: "MM-DD HH:MM:SS.mmm PID TID LEVEL TAG: MESSAGE"
static LOGCAT_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\d+)\s+([VDIWEFA])\s+([^:]+):\s*(.*)$"
    ).expect("Invalid logcat regex")
});

/// Alternative format: "HH:MM:SS.mmm PID TID LEVEL TAG: MESSAGE"
static LOGCAT_ALT_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"^(\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\d+)\s+([VDIWEFA])\s+([^:]+):\s*(.*)$"
    ).expect("Invalid alt logcat regex")
});

/// Brief format: "LEVEL/TAG(PID): MESSAGE"
static LOGCAT_BRIEF_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"^([VDIWEFA])/([^(]+)\(\s*(\d+)\):\s*(.*)$"
    ).expect("Invalid brief logcat regex")
});

/// Parser for logcat output
pub struct LogParser {
    next_id: u64,
}

impl LogParser {
    pub fn new() -> Self {
        LogParser { next_id: 0 }
    }

    /// Parse a single line of logcat output
    pub fn parse_line(&mut self, line: &str) -> Option<LogEntry> {
        // Skip empty lines
        let line = line.trim();
        if line.is_empty() {
            return None;
        }

        // Skip "beginning of" messages
        if line.starts_with("--------- beginning of") {
            return None;
        }

        // Try standard format first (with date: MM-DD HH:MM:SS.mmm)
        if let Some(caps) = LOGCAT_REGEX.captures(line) {
            let timestamp_str = caps[1].to_string(); // "MM-DD HH:mm:ss.SSS"
            let now = chrono::Local::now();
            // 添加年份: "MM-DD HH:mm:ss.SSS" -> "YYYY-MM-DD HH:mm:ss.SSS"
            let date_time_with_year = format!("{}-{}", now.format("%Y"), timestamp_str);
            let entry = LogEntry {
                id: self.next_id,
                device_id: None,  // Will be set by commands.rs
                timestamp: timestamp_str.split_whitespace().last().unwrap_or(&timestamp_str).to_string(),
                date_time: Some(date_time_with_year),
                epoch: Some(now.timestamp_millis() as u64),
                pid: caps[2].parse().unwrap_or(0),
                tid: caps[3].parse().unwrap_or(0),
                level: LogLevel::from_char(caps[4].chars().next().unwrap_or('D'))
                    .unwrap_or(LogLevel::D),
                tag: caps[5].trim().to_string(),
                message: caps[6].to_string(),
                package_name: None,  // Will be filled by AdbManager
                process_name: None,  // Will be filled by AdbManager
                raw: Some(line.to_string()),
            };
            self.next_id += 1;
            return Some(entry);
        }

        // Try alternative format (without date: HH:MM:SS.mmm)
        if let Some(caps) = LOGCAT_ALT_REGEX.captures(line) {
            let now = chrono::Local::now();
            let timestamp_str = caps[1].to_string();
            let entry = LogEntry {
                id: self.next_id,
                device_id: None,
                timestamp: timestamp_str.clone(),
                date_time: Some(format!("{}-{} {}", now.format("%Y"), now.format("%m-%d"), timestamp_str)),
                epoch: Some(now.timestamp_millis() as u64),
                pid: caps[2].parse().unwrap_or(0),
                tid: caps[3].parse().unwrap_or(0),
                level: LogLevel::from_char(caps[4].chars().next().unwrap_or('D'))
                    .unwrap_or(LogLevel::D),
                tag: caps[5].trim().to_string(),
                message: caps[6].to_string(),
                package_name: None,
                process_name: None,
                raw: Some(line.to_string()),
            };
            self.next_id += 1;
            return Some(entry);
        }

        // Try brief format
        if let Some(caps) = LOGCAT_BRIEF_REGEX.captures(line) {
            let now = chrono::Local::now();
            let timestamp_str = now.format("%H:%M:%S%.3f").to_string();
            let entry = LogEntry {
                id: self.next_id,
                device_id: None,
                timestamp: timestamp_str.clone(),
                date_time: Some(format!("{}-{} {}", now.format("%Y"), now.format("%m-%d"), timestamp_str)),
                epoch: Some(now.timestamp_millis() as u64),
                pid: caps[3].parse().unwrap_or(0),
                tid: 0,
                level: LogLevel::from_char(caps[1].chars().next().unwrap_or('D'))
                    .unwrap_or(LogLevel::D),
                tag: caps[2].trim().to_string(),
                message: caps[4].to_string(),
                package_name: None,
                process_name: None,
                raw: Some(line.to_string()),
            };
            self.next_id += 1;
            return Some(entry);
        }

        // If no pattern matches, return as a debug message with "Unknown" tag
        // This handles continuation lines or unusual formats
        None
    }

    /// Parse multiple lines and return all valid entries
    pub fn parse_lines(&mut self, text: &str) -> Vec<LogEntry> {
        text.lines()
            .filter_map(|line| self.parse_line(line))
            .collect()
    }

    /// Reset the parser state
    pub fn reset(&mut self) {
        self.next_id = 0;
    }
}

impl Default for LogParser {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_standard_format() {
        let mut parser = LogParser::new();
        let line = "12-04 10:30:45.123  1234  5678 D MainActivity: onCreate called";
        let entry = parser.parse_line(line).unwrap();

        let year = chrono::Local::now().format("%Y").to_string();
        assert_eq!(entry.timestamp, "10:30:45.123");  // Only time part
        assert_eq!(entry.date_time, Some(format!("{}-12-04 10:30:45.123", year)));
        assert_eq!(entry.pid, 1234);
        assert_eq!(entry.tid, 5678);
        assert_eq!(entry.level, LogLevel::D);
        assert_eq!(entry.tag, "MainActivity");
        assert_eq!(entry.message, "onCreate called");
        assert!(entry.package_name.is_none());
        assert!(entry.process_name.is_none());
    }

    #[test]
    fn test_parse_brief_format() {
        let mut parser = LogParser::new();
        let line = "D/MainActivity( 1234): onCreate called";
        let entry = parser.parse_line(line).unwrap();
        
        assert_eq!(entry.pid, 1234);
        assert_eq!(entry.level, LogLevel::D);
        assert_eq!(entry.tag, "MainActivity");
        assert_eq!(entry.message, "onCreate called");
    }

    #[test]
    fn test_skip_beginning_marker() {
        let mut parser = LogParser::new();
        let line = "--------- beginning of main";
        let entry = parser.parse_line(line);
        assert!(entry.is_none());
    }
}

