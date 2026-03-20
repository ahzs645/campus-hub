#import <React/RCTViewManager.h>
#import <WebKit/WebKit.h>

@interface TVWebView : WKWebView
@property (nonatomic, copy) RCTBubblingEventBlock onLoadStart;
@property (nonatomic, copy) RCTBubblingEventBlock onLoadEnd;
@property (nonatomic, copy) RCTBubblingEventBlock onLoadError;
@end

@implementation TVWebView
@end

@interface TVWebViewManager : RCTViewManager <WKNavigationDelegate>
@end

@implementation TVWebViewManager

RCT_EXPORT_MODULE(TVWebView)

RCT_EXPORT_VIEW_PROPERTY(onLoadStart, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onLoadEnd, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onLoadError, RCTBubblingEventBlock)

RCT_CUSTOM_VIEW_PROPERTY(url, NSString, TVWebView)
{
  NSString *urlString = [RCTConvert NSString:json];
  if (urlString) {
    NSURL *url = [NSURL URLWithString:urlString];
    if (url) {
      NSURLRequest *request = [NSURLRequest requestWithURL:url];
      [view loadRequest:request];
    }
  }
}

- (UIView *)view
{
  WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
  config.allowsInlineMediaPlayback = YES;
  config.mediaTypesRequiringUserActionForPlayback = WKAudiovisualMediaTypeNone;

  TVWebView *webView = [[TVWebView alloc] initWithFrame:CGRectZero configuration:config];
  webView.navigationDelegate = self;
  webView.scrollView.scrollEnabled = YES;
  webView.backgroundColor = [UIColor blackColor];
  webView.opaque = NO;

  return webView;
}

#pragma mark - WKNavigationDelegate

- (void)webView:(WKWebView *)webView didStartProvisionalNavigation:(WKNavigation *)navigation
{
  TVWebView *tvWebView = (TVWebView *)webView;
  if (tvWebView.onLoadStart) {
    tvWebView.onLoadStart(@{@"url": webView.URL.absoluteString ?: @""});
  }
}

- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation
{
  TVWebView *tvWebView = (TVWebView *)webView;
  if (tvWebView.onLoadEnd) {
    tvWebView.onLoadEnd(@{@"url": webView.URL.absoluteString ?: @""});
  }
}

- (void)webView:(WKWebView *)webView didFailProvisionalNavigation:(WKNavigation *)navigation withError:(NSError *)error
{
  TVWebView *tvWebView = (TVWebView *)webView;
  if (tvWebView.onLoadError) {
    tvWebView.onLoadError(@{
      @"url": webView.URL.absoluteString ?: @"",
      @"description": error.localizedDescription ?: @"Unknown error",
      @"code": @(error.code)
    });
  }
}

@end
