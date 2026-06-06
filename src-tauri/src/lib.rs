use serde::Serialize;
use std::{
  io::{Read, Write},
  net::{TcpListener, TcpStream},
  process::Command,
  sync::{Arc, Mutex},
  thread,
  time::Duration,
};
use tauri::{AppHandle, Emitter, Manager};

const AUTH_CALLBACK_PATH: &str = "/auth/misskey";
const AUTH_CALLBACK_EVENT: &str = "feditile://auth-callback";

#[derive(Debug, Default)]
struct AuthState {
  callback_base_url: Option<String>,
  pending_auth_url: Option<String>,
}

type SharedAuthState = Arc<Mutex<AuthState>>;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AuthConfig {
  auth_callback_base_url: Option<String>,
  pending_auth_url: Option<String>,
}

#[tauri::command]
fn get_auth_config(state: tauri::State<'_, SharedAuthState>) -> AuthConfig {
  let state = state.lock().expect("auth state poisoned");
  AuthConfig {
    auth_callback_base_url: state.callback_base_url.clone(),
    pending_auth_url: state.pending_auth_url.clone(),
  }
}


#[tauri::command]
fn open_auth_window(_app: AppHandle, url: String) -> Result<(), String> {
  let parsed = url::Url::parse(&url).map_err(|error| error.to_string())?;
  let target = parsed.as_str();

  #[cfg(target_os = "macos")]
  let mut command = {
    let mut command = Command::new("open");
    command.arg(target);
    command
  };

  #[cfg(target_os = "windows")]
  let mut command = {
    let mut command = Command::new("cmd");
    command.args(["/C", "start", "", target]);
    command
  };

  #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
  let mut command = {
    let mut command = Command::new("xdg-open");
    command.arg(target);
    command
  };

  command
    .spawn()
    .map(|_| ())
    .map_err(|error| format!("Failed to open system browser: {error}"))
}

#[tauri::command]
fn clear_pending_auth_callback(state: tauri::State<'_, SharedAuthState>) {
  if let Ok(mut state) = state.lock() {
    state.pending_auth_url = None;
  }
}

fn auth_success_page() -> &'static str {
  r#"<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>FediTile</title></head>
  <body style="background:#0d1117;color:#e6edf3;font-family:system-ui;padding:24px">
    <h1>FediTile</h1>
    <p>Authentication received. You can return to the app.</p>
  </body>
</html>"#
}

fn parse_request_path(request: &str) -> Option<&str> {
  let mut parts = request.lines().next()?.split_whitespace();
  let method = parts.next()?;
  let path = parts.next()?;
  if method == "GET" { Some(path) } else { None }
}

fn write_response(mut stream: TcpStream, status: &str, content_type: &str, body: &str) {
  let response = format!(
    "HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
    body.as_bytes().len()
  );
  let _ = stream.write_all(response.as_bytes());
  let _ = stream.flush();
}

fn handle_auth_request(mut stream: TcpStream, app: AppHandle, state: SharedAuthState) {
  let mut buffer = [0_u8; 8192];
  let read_len = match stream.read(&mut buffer) {
    Ok(len) => len,
    Err(_) => return,
  };

  let request = String::from_utf8_lossy(&buffer[..read_len]);
  let raw_path = match parse_request_path(&request) {
    Some(path) => path,
    None => {
      write_response(stream, "405 Method Not Allowed", "text/plain; charset=utf-8", "Method not allowed");
      return;
    }
  };

  let path_only = raw_path.split('?').next().unwrap_or(raw_path);
  if path_only != AUTH_CALLBACK_PATH {
    write_response(stream, "404 Not Found", "text/plain; charset=utf-8", "Not found");
    return;
  }

  let callback_base_url = {
    let state = state.lock().expect("auth state poisoned");
    state.callback_base_url.clone()
  };
  let Some(callback_base_url) = callback_base_url else {
    write_response(stream, "500 Internal Server Error", "text/plain; charset=utf-8", "Auth callback server is not ready");
    return;
  };

  let callback_url = format!("{callback_base_url}{}", raw_path.strip_prefix(AUTH_CALLBACK_PATH).unwrap_or(""));

  if let Ok(mut state) = state.lock() {
    state.pending_auth_url = Some(callback_url.clone());
  }

  let _ = app.emit(AUTH_CALLBACK_EVENT, callback_url);
  write_response(stream, "200 OK", "text/html; charset=utf-8", auth_success_page());
}

fn start_auth_server(app: AppHandle, state: SharedAuthState) -> std::io::Result<()> {
  let listener = TcpListener::bind(("127.0.0.1", 0))?;
  listener.set_nonblocking(true)?;

  let port = listener.local_addr()?.port();
  {
    let mut state = state.lock().expect("auth state poisoned");
    state.callback_base_url = Some(format!("http://127.0.0.1:{port}{AUTH_CALLBACK_PATH}"));
  }

  thread::spawn(move || loop {
    match listener.accept() {
      Ok((stream, _)) => handle_auth_request(stream, app.clone(), state.clone()),
      Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
        thread::sleep(Duration::from_millis(50));
      }
      Err(_) => break,
    }
  });

  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let auth_state: SharedAuthState = Arc::new(Mutex::new(AuthState::default()));

  tauri::Builder::default()
    .manage(auth_state.clone())
    .setup(move |app| {
      start_auth_server(app.handle().clone(), auth_state.clone())?;
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_title("FediTile");
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![get_auth_config, clear_pending_auth_callback, open_auth_window])
    .run(tauri::generate_context!())
    .expect("error while running FediTile");
}
