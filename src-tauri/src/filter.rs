use regex::Regex;
use serde::{Deserialize, Serialize};

use crate::parser::{LogEntry, LogLevel};

/// Filter configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterConfig {
    pub levels: Vec<LogLevel>,
    pub tags: Vec<String>,
    #[serde(rename = "packageName")]
    pub package_name: Option<String>,
    pub pid: Option<u32>,
    #[serde(rename = "searchText")]
    pub search_text: String,
    #[serde(rename = "isRegex")]
    pub is_regex: bool,
    #[serde(rename = "isCaseSensitive")]
    pub is_case_sensitive: bool,
}

impl Default for FilterConfig {
    fn default() -> Self {
        FilterConfig {
            levels: vec![
                LogLevel::V,
                LogLevel::D,
                LogLevel::I,
                LogLevel::W,
                LogLevel::E,
                LogLevel::A,
            ],
            tags: vec![],
            package_name: None,
            pid: None,
            search_text: String::new(),
            is_regex: false,
            is_case_sensitive: false,
        }
    }
}

/// Log filter engine
pub struct LogFilter {
    config: FilterConfig,
    compiled_regex: Option<Regex>,
}

impl LogFilter {
    pub fn new(config: FilterConfig) -> Self {
        let compiled_regex = Self::compile_search_regex(&config);
        LogFilter {
            config,
            compiled_regex,
        }
    }

    /// Compile search regex from config
    fn compile_search_regex(config: &FilterConfig) -> Option<Regex> {
        if config.search_text.is_empty() {
            return None;
        }

        let pattern = if config.is_regex {
            config.search_text.clone()
        } else {
            regex::escape(&config.search_text)
        };

        let regex_builder = if config.is_case_sensitive {
            Regex::new(&pattern)
        } else {
            Regex::new(&format!("(?i){}", pattern))
        };

        regex_builder.ok()
    }

    /// Update filter configuration
    pub fn update_config(&mut self, config: FilterConfig) {
        self.compiled_regex = Self::compile_search_regex(&config);
        self.config = config;
    }

    /// Check if a log entry matches the filter
    pub fn matches(&self, entry: &LogEntry) -> bool {
        // Check log level
        if !self.config.levels.contains(&entry.level) {
            return false;
        }

        // Check tags
        if !self.config.tags.is_empty() {
            let tag_lower = entry.tag.to_lowercase();
            let matches_tag = self.config.tags.iter().any(|t| {
                tag_lower.contains(&t.to_lowercase())
            });
            if !matches_tag {
                return false;
            }
        }

        // Check package name
        if let Some(ref pkg) = self.config.package_name {
            if !entry.tag.to_lowercase().contains(&pkg.to_lowercase()) {
                return false;
            }
        }

        // Check PID
        if let Some(pid) = self.config.pid {
            if entry.pid != pid {
                return false;
            }
        }

        // Check search text
        if let Some(ref regex) = self.compiled_regex {
            let search_target = format!("{} {}", entry.tag, entry.message);
            if !regex.is_match(&search_target) {
                return false;
            }
        }

        true
    }

    /// Filter a list of log entries
    pub fn filter_logs(&self, logs: &[LogEntry]) -> Vec<LogEntry> {
        logs.iter()
            .filter(|entry| self.matches(entry))
            .cloned()
            .collect()
    }

    /// Get current config
    pub fn config(&self) -> &FilterConfig {
        &self.config
    }
}

impl Default for LogFilter {
    fn default() -> Self {
        Self::new(FilterConfig::default())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_entry(level: LogLevel, tag: &str, message: &str) -> LogEntry {
        LogEntry {
            id: 0,
            timestamp: "12:00:00.000".to_string(),
            pid: 1234,
            tid: 5678,
            level,
            tag: tag.to_string(),
            message: message.to_string(),
            raw: None,
        }
    }

    #[test]
    fn test_level_filter() {
        let config = FilterConfig {
            levels: vec![LogLevel::E, LogLevel::W],
            ..Default::default()
        };
        let filter = LogFilter::new(config);

        let error_entry = create_test_entry(LogLevel::E, "Test", "Error message");
        let debug_entry = create_test_entry(LogLevel::D, "Test", "Debug message");

        assert!(filter.matches(&error_entry));
        assert!(!filter.matches(&debug_entry));
    }

    #[test]
    fn test_tag_filter() {
        let config = FilterConfig {
            tags: vec!["MainActivity".to_string()],
            ..Default::default()
        };
        let filter = LogFilter::new(config);

        let matching = create_test_entry(LogLevel::D, "MainActivity", "test");
        let not_matching = create_test_entry(LogLevel::D, "OtherActivity", "test");

        assert!(filter.matches(&matching));
        assert!(!filter.matches(&not_matching));
    }

    #[test]
    fn test_search_text_filter() {
        let config = FilterConfig {
            search_text: "error".to_string(),
            is_case_sensitive: false,
            ..Default::default()
        };
        let filter = LogFilter::new(config);

        let matching = create_test_entry(LogLevel::D, "Test", "An ERROR occurred");
        let not_matching = create_test_entry(LogLevel::D, "Test", "All good");

        assert!(filter.matches(&matching));
        assert!(!filter.matches(&not_matching));
    }

    #[test]
    fn test_regex_filter() {
        let config = FilterConfig {
            search_text: r"\d{4}".to_string(),
            is_regex: true,
            ..Default::default()
        };
        let filter = LogFilter::new(config);

        let matching = create_test_entry(LogLevel::D, "Test", "Code: 1234");
        let not_matching = create_test_entry(LogLevel::D, "Test", "No numbers");

        assert!(filter.matches(&matching));
        assert!(!filter.matches(&not_matching));
    }
}

