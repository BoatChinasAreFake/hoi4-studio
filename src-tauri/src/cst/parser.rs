use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TextSpan {
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FocusData {
    pub id: String,
    pub id_span: TextSpan,
    pub icon: String,
    pub icon_span: Option<TextSpan>,
    pub cost: f64,
    pub cost_span: Option<TextSpan>,
    pub x: i32,
    pub x_span: Option<TextSpan>,
    pub y: i32,
    pub y_span: Option<TextSpan>,
    pub relative_position_id: Option<String>,
    pub relative_position_span: Option<TextSpan>,
    pub prerequisites: Vec<Vec<String>>, // groups of OR / AND prerequisites
    pub mutually_exclusive: Vec<String>,
    pub available_raw: Option<String>,
    pub bypass_raw: Option<String>,
    pub completion_reward_raw: Option<String>,
    pub full_span: TextSpan,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FocusTreeData {
    pub id: String,
    pub id_span: TextSpan,
    pub country_factor_raw: Option<String>,
    pub default_tree: bool,
    pub focuses: Vec<FocusData>,
    pub full_span: TextSpan,
}

#[derive(Debug, Clone, PartialEq)]
pub enum TokenKind {
    Ident(String),
    StringLit(String),
    Equals,
    OpenBrace,
    CloseBrace,
    Comment(String),
    Whitespace(String),
    Other(char),
}

#[derive(Debug, Clone, PartialEq)]
pub struct Token {
    pub kind: TokenKind,
    pub span: TextSpan,
}

pub struct Lexer<'a> {
    source: &'a str,
    bytes: &'a [u8],
    cursor: usize,
}

impl<'a> Lexer<'a> {
    pub fn new(source: &'a str) -> Self {
        Self {
            source,
            bytes: source.as_bytes(),
            cursor: 0,
        }
    }

    pub fn tokenize(&mut self) -> Vec<Token> {
        let mut tokens = Vec::new();
        while self.cursor < self.bytes.len() {
            let start = self.cursor;
            let b = self.bytes[self.cursor];

            match b {
                b'#' => {
                    // Comment until newline
                    while self.cursor < self.bytes.len() && self.bytes[self.cursor] != b'\n' {
                        self.cursor += 1;
                    }
                    let text = &self.source[start..self.cursor];
                    tokens.push(Token {
                        kind: TokenKind::Comment(text.to_string()),
                        span: TextSpan { start, end: self.cursor },
                    });
                }
                b' ' | b'\t' | b'\r' | b'\n' => {
                    while self.cursor < self.bytes.len() && (
                        self.bytes[self.cursor] == b' '
                        || self.bytes[self.cursor] == b'\t'
                        || self.bytes[self.cursor] == b'\r'
                        || self.bytes[self.cursor] == b'\n'
                    ) {
                        self.cursor += 1;
                    }
                    let text = &self.source[start..self.cursor];
                    tokens.push(Token {
                        kind: TokenKind::Whitespace(text.to_string()),
                        span: TextSpan { start, end: self.cursor },
                    });
                }
                b'=' => {
                    self.cursor += 1;
                    tokens.push(Token {
                        kind: TokenKind::Equals,
                        span: TextSpan { start, end: self.cursor },
                    });
                }
                b'{' => {
                    self.cursor += 1;
                    tokens.push(Token {
                        kind: TokenKind::OpenBrace,
                        span: TextSpan { start, end: self.cursor },
                    });
                }
                b'}' => {
                    self.cursor += 1;
                    tokens.push(Token {
                        kind: TokenKind::CloseBrace,
                        span: TextSpan { start, end: self.cursor },
                    });
                }
                b'"' => {
                    self.cursor += 1; // skip opening quote
                    let str_start = self.cursor;
                    while self.cursor < self.bytes.len() && self.bytes[self.cursor] != b'"' {
                        if self.bytes[self.cursor] == b'\\' && self.cursor + 1 < self.bytes.len() {
                            self.cursor += 2;
                        } else {
                            self.cursor += 1;
                        }
                    }
                    let text = &self.source[str_start..self.cursor];
                    if self.cursor < self.bytes.len() && self.bytes[self.cursor] == b'"' {
                        self.cursor += 1; // skip closing quote
                    }
                    tokens.push(Token {
                        kind: TokenKind::StringLit(text.to_string()),
                        span: TextSpan { start, end: self.cursor },
                    });
                }
                _ => {
                    // Identifier / number / symbol
                    while self.cursor < self.bytes.len() {
                        let c = self.bytes[self.cursor];
                        if c == b'=' || c == b'{' || c == b'}' || c == b'#' || c == b' ' || c == b'\t' || c == b'\r' || c == b'\n' || c == b'"' {
                            break;
                        }
                        self.cursor += 1;
                    }
                    let text = &self.source[start..self.cursor];
                    tokens.push(Token {
                        kind: TokenKind::Ident(text.to_string()),
                        span: TextSpan { start, end: self.cursor },
                    });
                }
            }
        }
        tokens
    }
}

pub struct FocusTreeParser<'a> {
    source: &'a str,
    tokens: Vec<Token>,
    idx: usize,
}

impl<'a> FocusTreeParser<'a> {
    pub fn new(source: &'a str) -> Self {
        let mut lexer = Lexer::new(source);
        let all_tokens = lexer.tokenize();
        // Keep meaningful tokens for parsing, but retain full source references
        Self {
            source,
            tokens: all_tokens,
            idx: 0,
        }
    }

    fn peek_meaningful(&self) -> Option<&Token> {
        let mut i = self.idx;
        while i < self.tokens.len() {
            match self.tokens[i].kind {
                TokenKind::Whitespace(_) | TokenKind::Comment(_) => i += 1,
                _ => return Some(&self.tokens[i]),
            }
        }
        None
    }

    fn next_meaningful(&mut self) -> Option<Token> {
        while self.idx < self.tokens.len() {
            let tok = self.tokens[self.idx].clone();
            self.idx += 1;
            match tok.kind {
                TokenKind::Whitespace(_) | TokenKind::Comment(_) => continue,
                _ => return Some(tok),
            }
        }
        None
    }

    pub fn parse_focus_trees(&mut self) -> Vec<FocusTreeData> {
        let mut trees = Vec::new();
        while let Some(tok) = self.next_meaningful() {
            if let TokenKind::Ident(ref name) = tok.kind {
                if name == "focus_tree" {
                    if let Some(tree) = self.parse_focus_tree(tok.span.start) {
                        trees.push(tree);
                    }
                }
            }
        }
        trees
    }

    fn parse_focus_tree(&mut self, start_pos: usize) -> Option<FocusTreeData> {
        let eq = self.next_meaningful()?;
        if eq.kind != TokenKind::Equals { return None; }
        let open = self.next_meaningful()?;
        if open.kind != TokenKind::OpenBrace { return None; }

        let mut id = "unknown_tree".to_string();
        let mut id_span = TextSpan { start: start_pos, end: start_pos };
        let mut default_tree = false;
        let mut country_factor_raw = None;
        let mut focuses = Vec::new();

        while let Some(tok) = self.next_meaningful() {
            match tok.kind {
                TokenKind::CloseBrace => {
                    return Some(FocusTreeData {
                        id,
                        id_span,
                        country_factor_raw,
                        default_tree,
                        focuses,
                        full_span: TextSpan { start: start_pos, end: tok.span.end },
                    });
                }
                TokenKind::Ident(ref key) => {
                    match key.as_str() {
                        "id" => {
                            if let Some(Token { kind: TokenKind::Equals, .. }) = self.next_meaningful() {
                                if let Some(val) = self.next_meaningful() {
                                    match val.kind {
                                        TokenKind::Ident(s) | TokenKind::StringLit(s) => {
                                            id = s;
                                            id_span = val.span;
                                        }
                                        _ => {}
                                    }
                                }
                            }
                        }
                        "default" => {
                            if let Some(Token { kind: TokenKind::Equals, .. }) = self.next_meaningful() {
                                if let Some(val) = self.next_meaningful() {
                                    if let TokenKind::Ident(s) = val.kind {
                                        default_tree = s == "yes";
                                    }
                                }
                            }
                        }
                        "country" => {
                            let block_span = self.skip_block();
                            if let Some(span) = block_span {
                                country_factor_raw = Some(self.source[span.start..span.end].to_string());
                            }
                        }
                        "focus" => {
                            if let Some(f) = self.parse_focus(tok.span.start) {
                                focuses.push(f);
                            }
                        }
                        _ => {
                            // Skip any other top-level property
                            self.skip_value();
                        }
                    }
                }
                _ => {}
            }
        }

        None
    }

    fn parse_focus(&mut self, start_pos: usize) -> Option<FocusData> {
        let eq = self.next_meaningful()?;
        if eq.kind != TokenKind::Equals { return None; }
        let open = self.next_meaningful()?;
        if open.kind != TokenKind::OpenBrace { return None; }

        let mut id = String::new();
        let mut id_span = TextSpan { start: start_pos, end: start_pos };
        let mut icon = String::new();
        let mut icon_span = None;
        let mut cost = 10.0;
        let mut cost_span = None;
        let mut x = 0;
        let mut x_span = None;
        let mut y = 0;
        let mut y_span = None;
        let mut relative_position_id = None;
        let mut relative_position_span = None;
        let mut prerequisites = Vec::new();
        let mut mutually_exclusive = Vec::new();
        let mut available_raw = None;
        let mut bypass_raw = None;
        let mut completion_reward_raw = None;

        while let Some(tok) = self.next_meaningful() {
            match tok.kind {
                TokenKind::CloseBrace => {
                    return Some(FocusData {
                        id,
                        id_span,
                        icon,
                        icon_span,
                        cost,
                        cost_span,
                        x,
                        x_span,
                        y,
                        y_span,
                        relative_position_id,
                        relative_position_span,
                        prerequisites,
                        mutually_exclusive,
                        available_raw,
                        bypass_raw,
                        completion_reward_raw,
                        full_span: TextSpan { start: start_pos, end: tok.span.end },
                    });
                }
                TokenKind::Ident(ref key) => {
                    match key.as_str() {
                        "id" => {
                            if let Some(Token { kind: TokenKind::Equals, .. }) = self.next_meaningful() {
                                if let Some(val) = self.next_meaningful() {
                                    if let TokenKind::Ident(s) | TokenKind::StringLit(s) = val.kind {
                                        id = s;
                                        id_span = val.span;
                                    }
                                }
                            }
                        }
                        "icon" => {
                            if let Some(Token { kind: TokenKind::Equals, .. }) = self.next_meaningful() {
                                if let Some(val) = self.next_meaningful() {
                                    if let TokenKind::Ident(s) | TokenKind::StringLit(s) = val.kind {
                                        icon = s;
                                        icon_span = Some(val.span);
                                    }
                                }
                            }
                        }
                        "cost" => {
                            if let Some(Token { kind: TokenKind::Equals, .. }) = self.next_meaningful() {
                                if let Some(val) = self.next_meaningful() {
                                    if let TokenKind::Ident(ref s) = val.kind {
                                        if let Ok(c) = s.parse::<f64>() {
                                            cost = c;
                                            cost_span = Some(val.span);
                                        }
                                    }
                                }
                            }
                        }
                        "x" => {
                            if let Some(Token { kind: TokenKind::Equals, .. }) = self.next_meaningful() {
                                if let Some(val) = self.next_meaningful() {
                                    if let TokenKind::Ident(ref s) = val.kind {
                                        if let Ok(num) = s.parse::<i32>() {
                                            x = num;
                                            x_span = Some(val.span);
                                        }
                                    }
                                }
                            }
                        }
                        "y" => {
                            if let Some(Token { kind: TokenKind::Equals, .. }) = self.next_meaningful() {
                                if let Some(val) = self.next_meaningful() {
                                    if let TokenKind::Ident(ref s) = val.kind {
                                        if let Ok(num) = s.parse::<i32>() {
                                            y = num;
                                            y_span = Some(val.span);
                                        }
                                    }
                                }
                            }
                        }
                        "relative_position_id" => {
                            if let Some(Token { kind: TokenKind::Equals, .. }) = self.next_meaningful() {
                                if let Some(val) = self.next_meaningful() {
                                    if let TokenKind::Ident(s) | TokenKind::StringLit(s) = val.kind {
                                        relative_position_id = Some(s);
                                        relative_position_span = Some(val.span);
                                    }
                                }
                            }
                        }
                        "prerequisite" => {
                            if let Some(prereq_group) = self.parse_prerequisite_block() {
                                prerequisites.push(prereq_group);
                            }
                        }
                        "mutually_exclusive" => {
                            if let Some(mut_group) = self.parse_mutually_exclusive_block() {
                                mutually_exclusive.extend(mut_group);
                            }
                        }
                        "available" => {
                            if let Some(span) = self.skip_block() {
                                available_raw = Some(self.source[span.start..span.end].to_string());
                            }
                        }
                        "bypass" => {
                            if let Some(span) = self.skip_block() {
                                bypass_raw = Some(self.source[span.start..span.end].to_string());
                            }
                        }
                        "completion_reward" => {
                            if let Some(span) = self.skip_block() {
                                completion_reward_raw = Some(self.source[span.start..span.end].to_string());
                            }
                        }
                        _ => {
                            self.skip_value();
                        }
                    }
                }
                _ => {}
            }
        }

        None
    }

    fn parse_prerequisite_block(&mut self) -> Option<Vec<String>> {
        let eq = self.next_meaningful()?;
        if eq.kind != TokenKind::Equals { return None; }
        let open = self.next_meaningful()?;
        if open.kind != TokenKind::OpenBrace { return None; }

        let mut list = Vec::new();
        while let Some(tok) = self.next_meaningful() {
            match tok.kind {
                TokenKind::CloseBrace => return Some(list),
                TokenKind::Ident(ref k) if k == "focus" => {
                    if let Some(Token { kind: TokenKind::Equals, .. }) = self.next_meaningful() {
                        if let Some(val) = self.next_meaningful() {
                            if let TokenKind::Ident(s) | TokenKind::StringLit(s) = val.kind {
                                list.push(s);
                            }
                        }
                    }
                }
                _ => {}
            }
        }
        Some(list)
    }

    fn parse_mutually_exclusive_block(&mut self) -> Option<Vec<String>> {
        let eq = self.next_meaningful()?;
        if eq.kind != TokenKind::Equals { return None; }
        let open = self.next_meaningful()?;
        if open.kind != TokenKind::OpenBrace { return None; }

        let mut list = Vec::new();
        while let Some(tok) = self.next_meaningful() {
            match tok.kind {
                TokenKind::CloseBrace => return Some(list),
                TokenKind::Ident(ref k) if k == "focus" => {
                    if let Some(Token { kind: TokenKind::Equals, .. }) = self.next_meaningful() {
                        if let Some(val) = self.next_meaningful() {
                            if let TokenKind::Ident(s) | TokenKind::StringLit(s) = val.kind {
                                list.push(s);
                            }
                        }
                    }
                }
                _ => {}
            }
        }
        Some(list)
    }

    fn skip_value(&mut self) {
        if let Some(Token { kind: TokenKind::Equals, .. }) = self.peek_meaningful() {
            self.next_meaningful(); // consume '='
            if let Some(next) = self.peek_meaningful() {
                if next.kind == TokenKind::OpenBrace {
                    self.skip_block();
                } else {
                    self.next_meaningful();
                }
            }
        }
    }

    fn skip_block(&mut self) -> Option<TextSpan> {
        let mut depth = 0;
        let mut start = 0;
        let mut found_open = false;

        while let Some(tok) = self.next_meaningful() {
            if tok.kind == TokenKind::OpenBrace {
                if !found_open {
                    start = tok.span.start;
                    found_open = true;
                }
                depth += 1;
            } else if tok.kind == TokenKind::CloseBrace {
                depth -= 1;
                if depth == 0 {
                    return Some(TextSpan { start, end: tok.span.end });
                }
            }
        }
        None
    }
}
