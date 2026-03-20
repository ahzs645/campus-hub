Pod::Spec.new do |s|
  s.name         = "TVWebViewNative"
  s.version      = "0.1.0"
  s.summary      = "Native WKWebView component for tvOS"
  s.homepage     = "https://github.com/campus-hub"
  s.license      = "MIT"
  s.author       = "Campus Hub"
  s.source       = { :path => "." }
  s.tvos.deployment_target = "16.0"
  s.source_files = "*.m"
  s.frameworks   = "WebKit"
  s.dependency "React-Core"
end
