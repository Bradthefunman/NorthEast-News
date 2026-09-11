#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>
#import <ImageIO/ImageIO.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>

static NSString * const NENErrorDomain = @"com.northeastnews.publisher";

@interface NENewsPublisher : NSObject <NSApplicationDelegate, WKScriptMessageHandler, WKUIDelegate>
@property(nonatomic,strong) NSWindow *window;
@property(nonatomic,strong) WKWebView *webView;
@property(nonatomic,copy) NSString *repositoryPath;
@property(nonatomic,strong) NSUserDefaults *defaults;
@property(nonatomic,copy) NSArray<NSString *> *allowedCategories;
@property(nonatomic,copy) NSArray<NSString *> *stateOrder;
@end

@implementation NENewsPublisher

- (instancetype)init {
    if ((self = [super init])) {
        _defaults = [NSUserDefaults standardUserDefaults];
        _allowedCategories = @[@"new-hampshire", @"new-england", @"massachusetts", @"rhode-island", @"tech", @"markets", @"more", @"breaking"];
        _stateOrder = @[@"NH", @"MA", @"RI", @"ME", @"VT", @"CT", @"NY", @"NJ", @"DC", @"US", @"National", @"Northeast", @"International", @"INTL", @"Global"];
        _repositoryPath = @"";
    }
    return self;
}

- (void)applicationDidFinishLaunching:(NSNotification *)notification {
    WKWebViewConfiguration *configuration = [[WKWebViewConfiguration alloc] init];
    [configuration.userContentController addScriptMessageHandler:self name:@"publisher"];
    self.webView = [[WKWebView alloc] initWithFrame:NSZeroRect configuration:configuration];
    self.webView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    self.webView.UIDelegate = self;

    self.window = [[NSWindow alloc] initWithContentRect:NSMakeRect(0, 0, 1380, 920)
                                               styleMask:(NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskMiniaturizable | NSWindowStyleMaskResizable)
                                                 backing:NSBackingStoreBuffered
                                                   defer:NO];
    self.window.title = @"NorthEast News Publisher";
    self.window.minSize = NSMakeSize(980, 680);
    self.window.contentView = self.webView;
    [self.window center];
    [self.window makeKeyAndOrderFront:nil];
    [NSApp activateIgnoringOtherApps:YES];
    [self loadInterface];
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender { return YES; }

- (void)loadInterface {
    NSMutableArray<NSURL *> *candidates = [NSMutableArray array];
    NSString *bundlePath = [[NSBundle mainBundle] pathForResource:@"index" ofType:@"html"];
    if (bundlePath) [candidates addObject:[NSURL fileURLWithPath:bundlePath]];
    NSString *cwd = [[NSFileManager defaultManager] currentDirectoryPath];
    [candidates addObject:[NSURL fileURLWithPath:[cwd stringByAppendingPathComponent:@"publisher/index.html"]]];
    NSString *executable = [[NSBundle mainBundle] executablePath];
    if (executable.length) {
        NSString *devPath = [[[executable stringByDeletingLastPathComponent] stringByAppendingPathComponent:@"../publisher"] stringByAppendingPathComponent:@"index.html"];
        [candidates addObject:[NSURL fileURLWithPath:devPath]];
    }
    for (NSURL *url in candidates) {
        if ([[NSFileManager defaultManager] fileExistsAtPath:url.path]) {
            NSString *html = [NSString stringWithContentsOfURL:url encoding:NSUTF8StringEncoding error:nil];
            if (html) { [self.webView loadHTMLString:html baseURL:url.URLByDeletingLastPathComponent]; return; }
        }
    }
    [self.webView loadHTMLString:@"<h1>Publisher interface not found</h1><p>Build the app with publisher/index.html as a resource.</p>" baseURL:nil];
}

- (void)userContentController:(WKUserContentController *)userContentController didReceiveScriptMessage:(WKScriptMessage *)message {
    if (![message.body isKindOfClass:[NSDictionary class]]) return;
    NSDictionary *body = message.body;
    NSString *action = body[@"action"];
    if (![action isKindOfClass:[NSString class]]) return;
    if ([action isEqualToString:@"load-repository"]) [self loadSavedRepository];
    else if ([action isEqualToString:@"choose-repository"]) [self chooseRepository];
    else if ([action isEqualToString:@"choose-image"]) [self chooseImage];
    else if ([action isEqualToString:@"stage-image"]) [self stageImage:body];
    else if ([action isEqualToString:@"save-draft"]) [self saveDraft:body[@"draft"]];
    else if ([action isEqualToString:@"delete-draft"]) [self deleteDraft:body[@"draftId"]];
    else if ([action isEqualToString:@"publish-article"]) [self publish:body[@"article"]];
    else if ([action isEqualToString:@"open-story"]) [self openStory:body[@"slug"]];
}

- (void)emit:(NSDictionary *)event {
    if (![NSJSONSerialization isValidJSONObject:event]) return;
    NSData *data = [NSJSONSerialization dataWithJSONObject:event options:0 error:nil];
    NSString *json = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    if (!json) return;
    NSString *script = [NSString stringWithFormat:@"window.publisherBridge && window.publisherBridge.handleEvent(%@);", json];
    dispatch_async(dispatch_get_main_queue(), ^{ [self.webView evaluateJavaScript:script completionHandler:nil]; });
}

- (void)sendError:(NSString *)message action:(NSString *)action {
    NSMutableDictionary *event = [@{ @"type": @"error", @"message": message ?: @"The publisher could not complete the operation." } mutableCopy];
    if (action) event[@"action"] = action;
    [self emit:event];
}

- (void)status:(NSString *)step detail:(NSString *)detail { [self emit:@{ @"type": @"publish-status", @"step": step ?: @"Publishing…", @"detail": detail ?: @"" }]; }

- (void)loadSavedRepository {
    NSString *path = NSProcessInfo.processInfo.environment[@"NEN_NEWS_REPO"] ?: [self.defaults stringForKey:@"NorthEastNewsPublisher.repositoryPath"] ?: @"";
    if (path.length) [self selectRepository:[NSURL fileURLWithPath:path] showError:NO];
    else [self emitRepoState:nil];
}

- (void)chooseRepository {
    NSOpenPanel *panel = [NSOpenPanel openPanel];
    panel.title = @"Choose the NorthEast News repository";
    panel.message = @"Select the local Git checkout that contains data/articles.json.";
    panel.canChooseFiles = NO;
    panel.canChooseDirectories = YES;
    panel.allowsMultipleSelection = NO;
    if (panel.runModal == NSModalResponseOK && panel.URL) [self selectRepository:panel.URL showError:YES];
}

- (void)selectRepository:(NSURL *)url showError:(BOOL)showError {
    NSString *path = url.standardizedURL.path;
    NSString *articles = [path stringByAppendingPathComponent:@"data/articles.json"];
    if (![[NSFileManager defaultManager] fileExistsAtPath:articles]) {
        if (showError) [self sendError:@"That folder does not contain data/articles.json. Choose the NorthEast News repository root." action:nil];
        return;
    }
    self.repositoryPath = path;
    [self.defaults setObject:path forKey:@"NorthEastNewsPublisher.repositoryPath"];
    [self emitRepoState:@"Repository connected"];
}

- (void)emitRepoState:(NSString *)message {
    NSMutableDictionary *payload = [@{ @"type": @"repo", @"repoPath": self.repositoryPath ?: @"", @"config": [self readConfig], @"articles": [self readArticles], @"drafts": [self loadDrafts], @"states": [self stateValues] } mutableCopy];
    if (message) payload[@"message"] = message;
    [self emit:payload];
}

- (id)readJSONAtPath:(NSString *)path {
    NSData *data = [NSData dataWithContentsOfFile:path];
    if (!data) return nil;
    return [NSJSONSerialization JSONObjectWithData:data options:NSJSONReadingAllowFragments error:nil];
}

- (NSDictionary *)readConfig {
    NSDictionary *config = [self readJSONAtPath:[self.repositoryPath stringByAppendingPathComponent:@"data/site-config.json"]];
    if ([config isKindOfClass:[NSDictionary class]]) return config;
    return @{ @"siteName": @"NorthEast News", @"siteUrl": @"https://www.northenews.com", @"timezone": @"America/New_York", @"organization": @{ @"logo": @"assets/og-default.svg" } };
}

- (NSArray *)readArticles {
    id object = [self readJSONAtPath:[self.repositoryPath stringByAppendingPathComponent:@"data/articles.json"]];
    if ([object isKindOfClass:[NSArray class]]) return object;
    if ([object isKindOfClass:[NSDictionary class]] && [object[@"articles"] isKindOfClass:[NSArray class]]) return object[@"articles"];
    return @[];
}

- (NSArray *)stateValues {
    NSMutableOrderedSet *values = [NSMutableOrderedSet orderedSetWithArray:self.stateOrder];
    for (NSDictionary *article in [self readArticles]) if ([article[@"state"] isKindOfClass:[NSString class]]) [values addObject:article[@"state"]];
    return values.array;
}

- (NSURL *)applicationSupportURL {
    NSURL *base = [[[NSFileManager defaultManager] URLsForDirectory:NSApplicationSupportDirectory inDomains:NSUserDomainMask] firstObject] ?: [NSURL fileURLWithPath:NSTemporaryDirectory()];
    NSURL *folder = [base URLByAppendingPathComponent:@"NorthEast News Publisher" isDirectory:YES];
    [[NSFileManager defaultManager] createDirectoryAtURL:folder withIntermediateDirectories:YES attributes:nil error:nil];
    return folder;
}

- (NSArray *)loadDrafts {
    NSURL *folder = [[self applicationSupportURL] URLByAppendingPathComponent:@"drafts" isDirectory:YES];
    NSArray *files = [[NSFileManager defaultManager] contentsOfDirectoryAtURL:folder includingPropertiesForKeys:nil options:0 error:nil] ?: @[];
    NSMutableArray *drafts = [NSMutableArray array];
    for (NSURL *url in files) if ([url.pathExtension isEqualToString:@"json"]) { id object = [self readJSONAtPath:url.path]; if ([object isKindOfClass:[NSDictionary class]]) [drafts addObject:object]; }
    [drafts sortUsingComparator:^NSComparisonResult(NSDictionary *a, NSDictionary *b) { return [[self text:b[@"savedAt"]] compare:[self text:a[@"savedAt"]]]; }];
    return drafts;
}

- (void)saveDraft:(NSDictionary *)draft {
    if (![draft isKindOfClass:[NSDictionary class]]) return;
    NSURL *folder = [[self applicationSupportURL] URLByAppendingPathComponent:@"drafts" isDirectory:YES];
    [[NSFileManager defaultManager] createDirectoryAtURL:folder withIntermediateDirectories:YES attributes:nil error:nil];
    NSString *given = [self text:draft[@"draftId"]];
    NSString *draftId = given.length ? [self safeFileName:given] : NSUUID.UUID.UUIDString.lowercaseString;
    NSMutableDictionary *saved = [draft mutableCopy];
    saved[@"draftId"] = draftId;
    saved[@"savedAt"] = [self localTimestamp];
    [saved removeObjectForKey:@"imageData"];
    NSData *data = [NSJSONSerialization dataWithJSONObject:saved options:NSJSONWritingPrettyPrinted | NSJSONWritingSortedKeys error:nil];
    if (!data) { [self sendError:@"This draft could not be encoded." action:nil]; return; }
    NSError *writeError = nil;
    [data writeToURL:[folder URLByAppendingPathComponent:[draftId stringByAppendingPathExtension:@"json"]] options:NSDataWritingAtomic error:&writeError];
    if (writeError) [self sendError:[NSString stringWithFormat:@"Could not save the local draft: %@", writeError.localizedDescription] action:nil];
    else [self emit:@{ @"type": @"draft-saved", @"draftId": draftId }];
}

- (void)deleteDraft:(NSString *)draftId {
    NSString *safe = [self safeFileName:draftId];
    if (!safe.length) return;
    NSURL *url = [[[self applicationSupportURL] URLByAppendingPathComponent:@"drafts" isDirectory:YES] URLByAppendingPathComponent:[safe stringByAppendingPathExtension:@"json"]];
    NSError *error = nil;
    if ([[NSFileManager defaultManager] fileExistsAtPath:url.path]) [[NSFileManager defaultManager] removeItemAtURL:url error:&error];
    if (error) [self sendError:[NSString stringWithFormat:@"Could not delete that local draft: %@", error.localizedDescription] action:nil];
    else [self emit:@{ @"type": @"draft-deleted" }];
}

- (void)chooseImage {
    NSOpenPanel *panel = [NSOpenPanel openPanel];
    panel.title = @"Choose an article image";
    panel.canChooseFiles = YES;
    panel.canChooseDirectories = NO;
    panel.allowsMultipleSelection = NO;
    panel.allowedContentTypes = @[[UTType typeWithIdentifier:@"public.image"]];
    if (panel.runModal == NSModalResponseOK && panel.URL) [self sendImage:panel.URL];
}

- (void)stageImage:(NSDictionary *)message {
    NSString *dataURL = [self text:message[@"dataUrl"]];
    NSRange comma = [dataURL rangeOfString:@","];
    if (comma.location == NSNotFound) { [self sendError:@"The dropped image could not be read." action:nil]; return; }
    NSData *data = [[NSData alloc] initWithBase64EncodedString:[dataURL substringFromIndex:comma.location + 1] options:NSDataBase64DecodingIgnoreUnknownCharacters];
    if (!data.length) { [self sendError:@"The dropped image was empty or invalid." action:nil]; return; }
    NSString *name = [self text:message[@"name"]];
    NSString *extension = [name.pathExtension.lowercaseString isEqualToString:@""] ? @"jpg" : name.pathExtension.lowercaseString;
    NSURL *folder = [[self applicationSupportURL] URLByAppendingPathComponent:@"staged" isDirectory:YES];
    [[NSFileManager defaultManager] createDirectoryAtURL:folder withIntermediateDirectories:YES attributes:nil error:nil];
    NSURL *url = [folder URLByAppendingPathComponent:[NSString stringWithFormat:@"%@.%@", NSUUID.UUID.UUIDString.lowercaseString, [self safeFileName:extension]]];
    NSError *error = nil;
    [data writeToURL:url options:NSDataWritingAtomic error:&error];
    if (error) [self sendError:[NSString stringWithFormat:@"Could not stage the dropped image: %@", error.localizedDescription] action:nil];
    else [self sendImage:url];
}

- (void)sendImage:(NSURL *)url {
    NSMutableDictionary *payload = [@{ @"type": @"image-ready", @"path": url.path ?: @"", @"name": url.lastPathComponent ?: @"image" } mutableCopy];
    NSData *data = [NSData dataWithContentsOfURL:url];
    NSString *mime = [self imageMime:url.pathExtension];
    if (data.length && mime) payload[@"dataUrl"] = [NSString stringWithFormat:@"data:%@;base64,%@", mime, [data base64EncodedStringWithOptions:0]];
    [self emit:payload];
}

- (NSString *)imageMime:(NSString *)extension {
    NSString *ext = extension.lowercaseString;
    if ([ext isEqualToString:@"jpg"] || [ext isEqualToString:@"jpeg"]) return @"image/jpeg";
    if ([ext isEqualToString:@"png"]) return @"image/png";
    if ([ext isEqualToString:@"gif"]) return @"image/gif";
    if ([ext isEqualToString:@"webp"]) return @"image/webp";
    if ([ext isEqualToString:@"heic"]) return @"image/heic";
    if ([ext isEqualToString:@"svg"]) return @"image/svg+xml";
    return nil;
}

- (void)publish:(NSDictionary *)form {
    if (![form isKindOfClass:[NSDictionary class]]) return;
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
        NSDictionary *result = nil;
        NSError *error = nil;
        if ([self performPublish:form result:&result error:&error]) [self emit:@{ @"type": @"publish-success", @"article": result[@"article"], @"url": result[@"url"] ?: @"" }];
        else [self sendError:error.localizedDescription action:@"publish"];
    });
}

- (BOOL)performPublish:(NSDictionary *)form result:(NSDictionary **)result error:(NSError **)error {
#define NEN_FAIL(message) do { if (error) *error = [NSError errorWithDomain:NENErrorDomain code:1 userInfo:@{NSLocalizedDescriptionKey:(message)}]; return NO; } while (0)
    if (!self.repositoryPath.length) NEN_FAIL(@"Choose the NorthEast News repository before publishing.");
    if (![[NSFileManager defaultManager] fileExistsAtPath:[self.repositoryPath stringByAppendingPathComponent:@".git"]]) NEN_FAIL(@"The selected folder is not a Git repository.");
    NSString *git = [self resolveCommand:@"git"];
    if (!git) NEN_FAIL(@"Git was not found on this Mac.");

    [self status:@"Checking repository…" detail:@"Looking for unrelated local changes."];
    NSDictionary *gitStatus = [self run:git arguments:@[@"status", @"--porcelain"] cwd:self.repositoryPath];
    if ([gitStatus[@"status"] intValue] != 0) NEN_FAIL([self commandError:gitStatus]);
    if ([self text:gitStatus[@"output"]].length) NEN_FAIL(@"The repository has local changes. Commit or stash them before publishing so unrelated work is not overwritten.");

    [self status:@"Downloading latest repository…" detail:@"Syncing the current branch with GitHub using a fast-forward-only pull."];
    NSDictionary *pull = [self run:git arguments:@[@"pull", @"--ff-only"] cwd:self.repositoryPath];
    if ([pull[@"status"] intValue] != 0) { NSString *message = [NSString stringWithFormat:@"Git could not fast-forward the repository. Resolve the branch state manually, then try again.\n%@", [self commandError:pull]]; NEN_FAIL(message); }

    NSArray *latest = [self readArticles];
    NSDictionary *config = [self readConfig];
    NSString *editingId = [self text:form[@"editingId"]];
    NSDictionary *existing = nil;
    for (NSDictionary *item in latest) if ([item[@"id"] isKindOfClass:[NSString class]] && [item[@"id"] isEqualToString:editingId]) { existing = item; break; }
    if (editingId.length && !existing) NEN_FAIL(@"The article changed or was removed while syncing. Reload the repository and try again.");

    [self status:@"Validating article…" detail:@"Checking fields, dates, IDs and slugs against the latest article file."];
    NSDictionary *article = [self buildArticle:form existing:existing allArticles:latest config:config error:error];
    if (!article) return NO;
    NSMutableArray *candidate = [latest mutableCopy];
    NSUInteger editIndex = NSNotFound;
    for (NSUInteger i = 0; i < candidate.count; i++) if ([candidate[i][@"id"] isKindOfClass:[NSString class]] && [candidate[i][@"id"] isEqualToString:editingId]) { editIndex = i; break; }
    if (editIndex != NSNotFound) candidate[editIndex] = article; else [candidate addObject:article];
    if ([self bool:article[@"featured"]]) {
        for (NSUInteger i = 0; i < candidate.count; i++) {
            if (i == (editIndex == NSNotFound ? candidate.count - 1 : editIndex)) continue;
            if ([candidate[i] isKindOfClass:[NSDictionary class]]) {
                NSMutableDictionary *other = [candidate[i] mutableCopy];
                other[@"featured"] = @NO;
                candidate[i] = other;
            }
        }
    }
    if (![self validateCandidate:candidate repository:self.repositoryPath error:error]) return NO;

    NSURL *repoURL = [NSURL fileURLWithPath:self.repositoryPath];
    NSArray *backupNames = @[@"data/articles.json", @"sitemap.xml", @"robots.txt"];
    NSMutableDictionary *backups = [NSMutableDictionary dictionary];
    for (NSString *path in backupNames) { NSData *data = [NSData dataWithContentsOfURL:[repoURL URLByAppendingPathComponent:path]]; backups[path] = data ?: [NSNull null]; }
    NSString *createdImagePath = nil;
    NSMutableArray *publishPaths = [@[@"data/articles.json", @"sitemap.xml", @"robots.txt"] mutableCopy];
    BOOL commitCreated = NO;
#define NEN_ABORT() do { [self restoreBackups:backups repoURL:repoURL git:git paths:publishPaths imagePath:createdImagePath]; return NO; } while (0)
#define NEN_FAIL_AFTER_BACKUP(message) do { [self restoreBackups:backups repoURL:repoURL git:git paths:publishPaths imagePath:createdImagePath]; NEN_FAIL(message); } while (0)
    @try {
        [self status:@"Writing article…" detail:@"Saving the same data/articles.json contract used by automated agents."];
        NSData *json = [NSJSONSerialization dataWithJSONObject:candidate options:NSJSONWritingPrettyPrinted | NSJSONWritingSortedKeys error:error];
        if (!json || ![json writeToURL:[repoURL URLByAppendingPathComponent:@"data/articles.json"] options:NSDataWritingAtomic error:error]) NEN_ABORT();
        NSString *sourcePath = [self text:form[@"imagePath"]];
        NSString *imageValue = [self text:article[@"image"]];
        if (sourcePath.length && [imageValue hasPrefix:@"pending:"] && ![self isRepositoryPath:sourcePath]) {
            NSDictionary *stored = [self storeImage:sourcePath slug:[self text:article[@"slug"]] repoURL:repoURL error:error];
            if (!stored) NEN_ABORT();
            NSMutableDictionary *updatedArticle = [article mutableCopy];
            updatedArticle[@"image"] = stored[@"relativePath"];
            if (editIndex != NSNotFound) candidate[editIndex] = updatedArticle; else candidate[candidate.count - 1] = updatedArticle;
            article = updatedArticle;
            createdImagePath = stored[@"absolutePath"];
            [publishPaths addObject:stored[@"relativePath"]];
            json = [NSJSONSerialization dataWithJSONObject:candidate options:NSJSONWritingPrettyPrinted | NSJSONWritingSortedKeys error:error];
            if (!json || ![json writeToURL:[repoURL URLByAppendingPathComponent:@"data/articles.json"] options:NSDataWritingAtomic error:error]) NEN_ABORT();
        }

        if (![self generateCrawlFilesWithConfig:config articles:candidate repoURL:repoURL error:error]) NEN_ABORT();
        [self status:@"Validating site…" detail:@"Running the repository validator and checking generated crawl files."];
        if (![self validateCandidate:candidate repository:self.repositoryPath error:error]) NEN_ABORT();
        NSString *node = [self resolveCommand:@"node"];
        if (node) {
            NSDictionary *validation = [self run:node arguments:@[@"scripts/validate-site.js"] cwd:self.repositoryPath];
            if ([validation[@"status"] intValue] != 0) { NSString *message = [NSString stringWithFormat:@"The NorthEast News site validator failed. No commit was created.\n%@", [self commandError:validation]]; NEN_FAIL_AFTER_BACKUP(message); }
        }

        [self status:@"Preparing commit…" detail:@"Staging only the article, generated crawl files and selected image."];
        NSDictionary *add = [self run:git arguments:[@[@"add", @"--"] arrayByAddingObjectsFromArray:publishPaths] cwd:self.repositoryPath];
        if ([add[@"status"] intValue] != 0) { NSString *message = [NSString stringWithFormat:@"Git could not stage the publisher changes: %@", [self commandError:add]]; NEN_FAIL_AFTER_BACKUP(message); }
        NSDictionary *staged = [self run:git arguments:@[@"diff", @"--cached", @"--name-only"] cwd:self.repositoryPath];
        NSSet *allowed = [NSSet setWithArray:publishPaths];
        NSMutableSet *stagedPaths = [NSMutableSet set];
        for (NSString *path in [[self text:staged[@"output"]] componentsSeparatedByCharactersInSet:NSCharacterSet.newlineCharacterSet]) if (path.length) [stagedPaths addObject:path];
        NSMutableSet *unexpected = [stagedPaths mutableCopy]; [unexpected minusSet:allowed];
        if (unexpected.count) NEN_FAIL_AFTER_BACKUP(@"Unexpected files were staged. Nothing was committed; inspect the repository before trying again.");
        if (!stagedPaths.count) NEN_FAIL_AFTER_BACKUP(@"There are no changes to publish.");

        NSString *commitMessage = [NSString stringWithFormat:@"%@: %@", editingId.length ? @"Update" : @"Publish", [self text:article[@"headline"]]];
        NSDictionary *commit = [self run:git arguments:@[@"commit", @"-m", commitMessage] cwd:self.repositoryPath];
        if ([commit[@"status"] intValue] != 0) { NSString *message = [NSString stringWithFormat:@"Git could not create the publish commit: %@", [self commandError:commit]]; NEN_FAIL_AFTER_BACKUP(message); }
        commitCreated = YES;
        [self status:@"Pushing to GitHub…" detail:@"Sending the verified commit to the repository remote."];
        NSDictionary *push = [self run:git arguments:@[@"push"] cwd:self.repositoryPath];
        if ([push[@"status"] intValue] != 0) { NSString *message = [NSString stringWithFormat:@"The article was committed locally, but GitHub rejected the push.\n%@", [self commandError:push]]; NEN_FAIL(message); }
        NSString *draftId = [self text:form[@"draftId"]]; if (draftId.length) [self deleteDraftFile:draftId];
        NSString *site = [[self text:config[@"siteUrl"]] stringByTrimmingCharactersInSet:[NSCharacterSet characterSetWithCharactersInString:@"/"]];
        if (!site.length) site = @"https://www.northenews.com";
        NSString *url = [NSString stringWithFormat:@"%@/article.html?slug=%@", site, [self urlEncode:[self text:article[@"slug"]]]];
        if (result) *result = @{ @"article": article, @"url": url };
        return YES;
    } @catch (NSException *exception) {
        if (!commitCreated) [self restoreBackups:backups repoURL:repoURL git:git paths:publishPaths imagePath:createdImagePath];
        if (error) *error = [NSError errorWithDomain:NENErrorDomain code:2 userInfo:@{NSLocalizedDescriptionKey:exception.reason ?: @"The publisher stopped unexpectedly."}];
        return NO;
    }
#undef NEN_FAIL_AFTER_BACKUP
#undef NEN_ABORT
#undef NEN_FAIL
}

- (NSDictionary *)buildArticle:(NSDictionary *)form existing:(NSDictionary *)existing allArticles:(NSArray *)allArticles config:(NSDictionary *)config error:(NSError **)error {
#define NEN_BUILD_FAIL(message) do { if (error) *error = [NSError errorWithDomain:NENErrorDomain code:3 userInfo:@{NSLocalizedDescriptionKey:(message)}]; return nil; } while (0)
    NSString *headline = [self text:form[@"headline"]], *bodyText = [self text:form[@"body"]], *category = [self text:form[@"category"]], *state = [self text:form[@"state"]];
    NSArray *body = [self bodyBlocks:bodyText];
    NSString *city = [self text:form[@"city"]], *location = [self text:form[@"location"]];
    if (!headline.length || headline.length < 5) NEN_BUILD_FAIL(@"Headline is required and should be at least five characters.");
    if (!body.count) NEN_BUILD_FAIL(@"Article body is required.");
    if (![self.allowedCategories containsObject:category]) NEN_BUILD_FAIL(@"Select one of the existing NorthEast News categories.");
    NSString *sourceURL = [self text:form[@"sourceUrl"]], *sourceName = [self text:form[@"sourceName"]];
    if (sourceURL.length && ![self isHTTPURL:sourceURL]) NEN_BUILD_FAIL(@"Source URL must be a valid http or https URL.");
    if (![self bool:form[@"archive"]] && (!sourceURL.length || !sourceName.length)) NEN_BUILD_FAIL(@"Live stories need both a source name and a source URL. Archive/context stories may omit them.");
    NSString *timestamp = [self normalizeTimestamp:[self text:form[@"publishedAt"]] timezone:[self text:config[@"timezone"]] error:error];
    if (!timestamp) return nil;
    BOOL editing = existing != nil;
    NSString *oldSlug = [self text:existing[@"slug"]], *oldId = [self text:existing[@"id"]];
    NSString *slug = [self slugify:[self text:form[@"slug"]].length ? [self text:form[@"slug"]] : headline];
    if (!slug.length) NEN_BUILD_FAIL(@"A usable slug could not be generated from the headline.");
    NSString *idValue = editing ? oldId : ([self text:form[@"articleId"]].length ? [self text:form[@"articleId"]] : [self uniqueID:slug articles:allArticles]);
    if (!idValue.length) NEN_BUILD_FAIL(@"A unique article ID could not be generated.");
    for (NSDictionary *item in allArticles) {
        NSString *itemId = [self text:item[@"id"]];
        if ([itemId isEqualToString:idValue] && ![itemId isEqualToString:oldId]) NEN_BUILD_FAIL(@"That article ID is already in use.");
        if ([[self text:item[@"slug"]] isEqualToString:slug] && ![[self text:item[@"slug"]] isEqualToString:oldSlug]) NEN_BUILD_FAIL(@"That slug is already in use. Choose a different headline or slug.");
    }
    NSMutableDictionary *article = existing ? [existing mutableCopy] : [NSMutableDictionary dictionary];
    BOOL breaking = [self bool:form[@"breaking"]], developing = [self bool:form[@"developing"]];
    NSString *topic = [self deriveTopic:category state:state breaking:breaking], *topicLabel = [self deriveTopicLabel:topic category:category];
    article[@"analysis"] = @([self bool:form[@"analysis"]]); article[@"author"] = [self text:form[@"author"]].length ? [self text:form[@"author"]] : @"NorthEast News Desk"; article[@"body"] = body; article[@"breaking"] = @(breaking); article[@"category"] = category; article[@"city"] = city.length ? city : [NSNull null]; article[@"dek"] = [self text:form[@"dek"]]; article[@"developing"] = @(developing); article[@"featured"] = @([self bool:form[@"featured"]]); article[@"headline"] = headline; article[@"id"] = idValue; article[@"imageAlt"] = [self text:form[@"imageAlt"]]; article[@"location"] = location.length ? location : [self defaultLocation:category state:state]; article[@"publishedAt"] = timestamp; article[@"slug"] = slug; article[@"sourceName"] = sourceName.length ? sourceName : [NSNull null]; article[@"sourceUrl"] = sourceURL.length ? sourceURL : [NSNull null]; article[@"state"] = state.length ? state : @"Northeast"; article[@"tags"] = [self parseTags:[self text:form[@"tags"]]]; article[@"trending"] = @([self bool:form[@"trending"]]); article[@"updatedAt"] = editing ? [self localTimestamp] : timestamp; article[@"visualLabel"] = [self text:form[@"visualLabel"]].length ? [self text:form[@"visualLabel"]] : [self defaultVisualLabel:category breaking:breaking developing:developing]; article[@"topic"] = topic.length ? topic : [NSNull null]; article[@"topicLabel"] = topicLabel.length ? topicLabel : [NSNull null]; article[@"archive"] = @([self bool:form[@"archive"]]); article[@"image"] = existing[@"image"] ?: [NSNull null]; article[@"seoTitle"] = [self text:form[@"seoTitle"]].length ? [self text:form[@"seoTitle"]] : [NSNull null]; article[@"seoDescription"] = [self text:form[@"seoDescription"]].length ? [self text:form[@"seoDescription"]] : [NSNull null]; article[@"canonicalUrl"] = existing[@"canonicalUrl"] ?: [NSNull null];
    NSString *imagePath = [self text:form[@"imagePath"]];
    if ([self bool:form[@"imageRemoved"]]) { article[@"image"] = [NSNull null]; article[@"imageAlt"] = @""; }
    else if (imagePath.length) {
        if ([self isRepositoryPath:imagePath]) article[@"image"] = [imagePath isAbsolutePath] ? [self relativePath:imagePath from:[NSURL fileURLWithPath:self.repositoryPath]] : imagePath;
        else article[@"image"] = [NSString stringWithFormat:@"pending:%@", imagePath];
        if (![self text:form[@"imageAlt"]].length) NEN_BUILD_FAIL(@"Add an image description for the custom image, or clear the image to use the NorthEast News placeholder.");
    }
    return article;
#undef NEN_BUILD_FAIL
}

- (BOOL)validateCandidate:(NSArray *)articles repository:(NSString *)repository error:(NSError **)error {
    NSMutableSet *ids = [NSMutableSet set], *slugs = [NSMutableSet set];
    for (NSDictionary *article in articles) {
        NSString *idValue = [self text:article[@"id"]], *slug = [self text:article[@"slug"]], *headline = [self text:article[@"headline"]], *published = [self text:article[@"publishedAt"]];
        if (!idValue.length || !slug.length || !headline.length || !published.length) { if (error) *error = [NSError errorWithDomain:NENErrorDomain code:4 userInfo:@{NSLocalizedDescriptionKey:@"The article file contains a missing required field."}]; return NO; }
        if ([ids containsObject:idValue]) { if (error) *error = [NSError errorWithDomain:NENErrorDomain code:4 userInfo:@{NSLocalizedDescriptionKey:[NSString stringWithFormat:@"Duplicate article ID detected: %@", idValue]}]; return NO; }
        if ([slugs containsObject:slug]) { if (error) *error = [NSError errorWithDomain:NENErrorDomain code:4 userInfo:@{NSLocalizedDescriptionKey:[NSString stringWithFormat:@"Duplicate article slug detected: %@", slug]}]; return NO; }
        [ids addObject:idValue]; [slugs addObject:slug];
        if (![self bodyBlocksFromJSON:article[@"body"]].count || ![self normalizeISO:published]) { if (error) *error = [NSError errorWithDomain:NENErrorDomain code:4 userInfo:@{NSLocalizedDescriptionKey:@"An article has an empty body or invalid publication timestamp."}]; return NO; }
        NSString *image = [self text:article[@"image"]];
        if (image.length && ![image hasPrefix:@"pending:"] && ![[NSFileManager defaultManager] fileExistsAtPath:[[NSURL fileURLWithPath:repository] URLByAppendingPathComponent:image].path]) { if (error) *error = [NSError errorWithDomain:NENErrorDomain code:4 userInfo:@{NSLocalizedDescriptionKey:[NSString stringWithFormat:@"Image reference does not exist: %@", image]}]; return NO; }
    }
    NSArray *routes = @[@"new-hampshire", @"massachusetts", @"rhode-island", @"breaking", @"tech", @"markets", @"misc", @"search", @"business-directory", @"about", @"editorial-standards", @"corrections", @"privacy", @"terms", @"advertise", @"tips", @"contact"];
    for (NSString *route in routes) if (![[NSFileManager defaultManager] fileExistsAtPath:[[repository stringByAppendingPathComponent:route] stringByAppendingPathComponent:@"index.html"]]) { if (error) *error = [NSError errorWithDomain:NENErrorDomain code:4 userInfo:@{NSLocalizedDescriptionKey:[NSString stringWithFormat:@"Required public route is missing: %@", route]}]; return NO; }
    return YES;
}

- (NSDictionary *)storeImage:(NSString *)sourcePath slug:(NSString *)slug repoURL:(NSURL *)repoURL error:(NSError **)error {
    NSURL *source = [NSURL fileURLWithPath:sourcePath].standardizedURL;
    if (![[NSFileManager defaultManager] fileExistsAtPath:source.path]) { if (error) *error = [NSError errorWithDomain:NENErrorDomain code:5 userInfo:@{NSLocalizedDescriptionKey:@"The selected image is no longer available."}]; return nil; }
    NSURL *folder = [repoURL URLByAppendingPathComponent:@"assets/images" isDirectory:YES];
    if (![[NSFileManager defaultManager] createDirectoryAtURL:folder withIntermediateDirectories:YES attributes:nil error:error]) return nil;
    NSString *base = [self safeFileName:slug]; if (!base.length) base = @"north-east-news-image";
    NSURL *destination = [folder URLByAppendingPathComponent:[NSString stringWithFormat:@"%@.jpg", base]]; NSInteger index = 2;
    while ([[NSFileManager defaultManager] fileExistsAtPath:destination.path]) destination = [folder URLByAppendingPathComponent:[NSString stringWithFormat:@"%@-%ld.jpg", base, (long)index++]];
    if (![self optimizeImage:source destination:destination]) {
        [[NSFileManager defaultManager] removeItemAtURL:destination error:nil];
        NSString *extension = source.pathExtension.lowercaseString.length ? source.pathExtension.lowercaseString : @"bin";
        NSURL *rawDestination = [folder URLByAppendingPathComponent:[NSString stringWithFormat:@"%@.%@", base, extension]];
        NSInteger rawIndex = 2;
        while ([[NSFileManager defaultManager] fileExistsAtPath:rawDestination.path]) rawDestination = [folder URLByAppendingPathComponent:[NSString stringWithFormat:@"%@-%ld.%@", base, (long)rawIndex++, extension]];
        if (![[NSFileManager defaultManager] copyItemAtURL:source toURL:rawDestination error:error]) return nil;
        destination = rawDestination;
    }
    return @{ @"relativePath": [self relativePath:destination.path from:repoURL], @"absolutePath": destination.path };
}

- (BOOL)optimizeImage:(NSURL *)source destination:(NSURL *)destination {
    CGImageSourceRef imageSource = CGImageSourceCreateWithURL((__bridge CFURLRef)source, NULL);
    CGImageRef image = imageSource ? CGImageSourceCreateImageAtIndex(imageSource, 0, NULL) : NULL;
    CGImageDestinationRef destinationRef = image ? CGImageDestinationCreateWithURL((__bridge CFURLRef)destination, CFSTR("public.jpeg"), 1, NULL) : NULL;
    if (!imageSource || !image || !destinationRef) { if (imageSource) CFRelease(imageSource); if (image) CGImageRelease(image); if (destinationRef) CFRelease(destinationRef); return NO; }
    CGFloat width = CGImageGetWidth(image), height = CGImageGetHeight(image), scale = MIN(1.0, 2200.0 / MAX(width, height));
    CGImageRef output = image;
    CGContextRef context = NULL;
    if (scale < 1.0) { context = CGBitmapContextCreate(NULL, (size_t)(width * scale), (size_t)(height * scale), CGImageGetBitsPerComponent(image), 0, CGColorSpaceCreateDeviceRGB(), kCGImageAlphaPremultipliedLast); if (context) { CGContextSetInterpolationQuality(context, kCGInterpolationHigh); CGContextDrawImage(context, CGRectMake(0, 0, width * scale, height * scale), image); output = CGBitmapContextCreateImage(context); } }
    NSDictionary *options = @{ (id)kCGImageDestinationLossyCompressionQuality: @0.84 };
    CGImageDestinationAddImage(destinationRef, output, (__bridge CFDictionaryRef)options);
    BOOL success = CGImageDestinationFinalize(destinationRef);
    if (output != image) CGImageRelease(output); if (context) CGContextRelease(context); CGImageDestinationRef destinationToRelease = destinationRef; CFRelease(destinationToRelease); CGImageRelease(image); CFRelease(imageSource);
    return success;
}

- (BOOL)generateCrawlFilesWithConfig:(NSDictionary *)config articles:(NSArray *)articles repoURL:(NSURL *)repoURL error:(NSError **)error {
    NSString *node = [self resolveCommand:@"node"];
    if (node) { NSDictionary *result = [self run:node arguments:@[@"scripts/generate-sitemap.js"] cwd:repoURL.path]; if ([result[@"status"] intValue] != 0) { if (error) *error = [NSError errorWithDomain:NENErrorDomain code:6 userInfo:@{NSLocalizedDescriptionKey:[NSString stringWithFormat:@"Crawl-file generation failed: %@", [self commandError:result]]}]; return NO; } return YES; }
    NSString *base = [[self text:config[@"siteUrl"]] stringByTrimmingCharactersInSet:[NSCharacterSet characterSetWithCharactersInString:@"/"]]; if (!base.length) base = @"https://www.northenews.com";
    NSArray *routes = @[@[@"/", @"1.0"], @[@"/new-hampshire/", @"0.9"], @[@"/massachusetts/", @"0.8"], @[@"/rhode-island/", @"0.8"], @[@"/breaking/", @"0.7"], @[@"/tech/", @"0.7"], @[@"/markets/", @"0.7"], @[@"/misc/", @"0.5"], @[@"/search/", @"0.6"], @[@"/archive.html", @"0.7"], @[@"/business-directory/", @"0.6"], @[@"/about/", @"0.4"], @[@"/editorial-standards/", @"0.4"], @[@"/corrections/", @"0.4"], @[@"/privacy/", @"0.3"], @[@"/terms/", @"0.3"], @[@"/advertise/", @"0.6"], @[@"/tips/", @"0.6"], @[@"/contact/", @"0.4"]];
    NSString *today = [[self localTimestamp] substringToIndex:10]; NSMutableArray *entries = [NSMutableArray array];
    for (NSArray *route in routes) [entries addObject:[NSString stringWithFormat:@"<url><loc>%@</loc><lastmod>%@</lastmod><priority>%@</priority></url>", [self xmlEscape:[base stringByAppendingString:route[0]]], today, route[1]]];
    for (NSDictionary *article in articles) { NSString *slug = [self text:article[@"slug"]]; if (!slug.length) continue; NSString *lastmod = [self text:article[@"updatedAt"]].length ? [self text:article[@"updatedAt"]] : [self text:article[@"publishedAt"]]; [entries addObject:[NSString stringWithFormat:@"<url><loc>%@</loc><lastmod>%@</lastmod><priority>%@</priority></url>", [self xmlEscape:[base stringByAppendingFormat:@"/article.html?slug=%@", [self urlEncode:slug]]], [lastmod substringToIndex:MIN(10, lastmod.length)], [self bool:article[@"featured"]] ? @"0.9" : @"0.7"]]; }
    NSString *sitemap = [NSString stringWithFormat:@"<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n  %@\n</urlset>\n", [entries componentsJoinedByString:@"\n  "]];
    NSString *robots = [NSString stringWithFormat:@"User-agent: *\nAllow: /\nDisallow: /submissions/\nSitemap: %@/sitemap.xml\n", base];
    if (![sitemap writeToURL:[repoURL URLByAppendingPathComponent:@"sitemap.xml"] atomically:YES encoding:NSUTF8StringEncoding error:error]) return NO;
    return [robots writeToURL:[repoURL URLByAppendingPathComponent:@"robots.txt"] atomically:YES encoding:NSUTF8StringEncoding error:error];
}

- (NSDictionary *)run:(NSString *)executable arguments:(NSArray *)arguments cwd:(NSString *)cwd {
    NSTask *task = [[NSTask alloc] init]; task.executableURL = [NSURL fileURLWithPath:executable]; task.arguments = arguments; task.currentDirectoryURL = [NSURL fileURLWithPath:cwd];
    NSPipe *output = [NSPipe pipe], *stderrPipe = [NSPipe pipe]; task.standardOutput = output; task.standardError = stderrPipe;
    @try { [task launch]; [task waitUntilExit]; NSData *out = [output.fileHandleForReading readDataToEndOfFile], *err = [stderrPipe.fileHandleForReading readDataToEndOfFile]; return @{ @"status": @((int)task.terminationStatus), @"output": [[NSString alloc] initWithData:out encoding:NSUTF8StringEncoding] ?: @"", @"error": [[NSString alloc] initWithData:err encoding:NSUTF8StringEncoding] ?: @"" }; } @catch (NSException *exception) { return @{ @"status": @(-1), @"output": @"", @"error": exception.reason ?: @"Command failed" }; }
}

- (NSString *)resolveCommand:(NSString *)name {
    NSString *envKey = [name isEqualToString:@"node"] ? @"NEN_NEWS_NODE" : @"NEN_NEWS_GIT";
    NSString *envPath = NSProcessInfo.processInfo.environment[envKey];
    if (envPath.length && [[NSFileManager defaultManager] isExecutableFileAtPath:envPath]) return envPath;
    NSArray *candidates = [name isEqualToString:@"git"] ? @[@"/usr/bin/git", @"/opt/homebrew/bin/git", @"/usr/local/bin/git"] : @[@"/opt/homebrew/bin/node", @"/usr/local/bin/node", @"/usr/bin/node"];
    for (NSString *path in candidates) if ([[NSFileManager defaultManager] isExecutableFileAtPath:path]) return path;
    NSDictionary *which = [self run:@"/usr/bin/which" arguments:@[name] cwd:NSFileManager.defaultManager.currentDirectoryPath]; NSString *path = [self text:which[@"output"]];
    return [which[@"status"] intValue] == 0 && [[NSFileManager defaultManager] isExecutableFileAtPath:path] ? path : nil;
}

- (NSString *)commandError:(NSDictionary *)result { NSString *value = [self text:result[@"error"]]; return value.length ? value : [self text:result[@"output"]]; }
- (void)openStory:(NSString *)slug { NSString *base = [[self text:[self readConfig][@"siteUrl"]] stringByTrimmingCharactersInSet:[NSCharacterSet characterSetWithCharactersInString:@"/"]]; NSURL *url = [NSURL URLWithString:[NSString stringWithFormat:@"%@/article.html?slug=%@", base.length ? base : @"https://www.northenews.com", [self urlEncode:slug]]]; if (url) [[NSWorkspace sharedWorkspace] openURL:url]; }
- (void)deleteDraftFile:(NSString *)draftId { NSString *safe = [self safeFileName:draftId]; if (!safe.length) return; NSURL *url = [[[self applicationSupportURL] URLByAppendingPathComponent:@"drafts" isDirectory:YES] URLByAppendingPathComponent:[safe stringByAppendingPathExtension:@"json"]]; [[NSFileManager defaultManager] removeItemAtURL:url error:nil]; }
- (void)restoreBackups:(NSDictionary *)backups repoURL:(NSURL *)repoURL git:(NSString *)git paths:(NSArray *)paths imagePath:(NSString *)imagePath {
    if (git.length && paths.count) [self run:git arguments:[@[@"reset", @"--"] arrayByAddingObjectsFromArray:paths] cwd:repoURL.path];
    NSFileManager *fileManager = NSFileManager.defaultManager;
    for (NSString *relativePath in backups) {
        NSURL *url = [repoURL URLByAppendingPathComponent:relativePath];
        id backup = backups[relativePath];
        if ([backup isKindOfClass:[NSData class]]) [backup writeToURL:url options:NSDataWritingAtomic error:nil];
        else [fileManager removeItemAtURL:url error:nil];
    }
    if (imagePath.length) [fileManager removeItemAtPath:imagePath error:nil];
}
- (BOOL)isRepositoryPath:(NSString *)path {
    if (!path.length) return NO;
    if (![path isAbsolutePath]) return [path hasPrefix:@"assets/"] && [NSFileManager.defaultManager fileExistsAtPath:[self.repositoryPath stringByAppendingPathComponent:path]];
    NSString *root = [NSURL fileURLWithPath:self.repositoryPath].standardizedURL.path, *candidate = [NSURL fileURLWithPath:path].standardizedURL.path;
    return [candidate isEqualToString:root] || [candidate hasPrefix:[root stringByAppendingString:@"/"]];
}
- (NSString *)relativePath:(NSString *)path from:(NSURL *)repo { NSString *root = repo.standardizedURL.path; if (![root hasSuffix:@"/"]) root = [root stringByAppendingString:@"/"]; return [[NSURL fileURLWithPath:path].standardizedURL.path stringByReplacingOccurrencesOfString:root withString:@""]; }
- (NSString *)text:(id)value { return [value isKindOfClass:[NSString class]] ? [value stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet] : @""; }
- (BOOL)bool:(id)value { return [value isKindOfClass:[NSNumber class]] ? [value boolValue] : [[self text:value] isEqualToString:@"true"]; }
- (NSArray *)bodyBlocks:(NSString *)value { NSArray *lines = [[value stringByReplacingOccurrencesOfString:@"\r\n" withString:@"\n"] componentsSeparatedByString:@"\n"]; NSMutableArray *blocks = [NSMutableArray array], *current = [NSMutableArray array]; for (NSString *line in lines) { if ([line stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet].length == 0) { if (current.count) { [blocks addObject:[[current componentsJoinedByString:@"\n"] stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet]]; [current removeAllObjects]; } } else [current addObject:line]; } if (current.count) [blocks addObject:[[current componentsJoinedByString:@"\n"] stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet]]; return blocks; }
- (NSArray *)bodyBlocksFromJSON:(id)value { return [value isKindOfClass:[NSArray class]] ? [value filteredArrayUsingPredicate:[NSPredicate predicateWithBlock:^BOOL(NSString *x, NSDictionary *_) { return [self text:x].length > 0; }]] : [self bodyBlocks:[self text:value]]; }
- (NSString *)slugify:(NSString *)value { NSString *folded = [value stringByFoldingWithOptions:NSDiacriticInsensitiveSearch | NSWidthInsensitiveSearch locale:[NSLocale localeWithLocaleIdentifier:@"en_US"]]; NSMutableString *result = [NSMutableString string]; NSCharacterSet *allowed = NSCharacterSet.alphanumericCharacterSet; for (NSUInteger i = 0; i < folded.length; i++) { unichar c = [folded characterAtIndex:i]; [result appendString:[allowed characterIsMember:c] ? [NSString stringWithFormat:@"%C", c] : @"-"]; } [result replaceOccurrencesOfString:@"-+" withString:@"-" options:NSRegularExpressionSearch range:NSMakeRange(0, result.length)]; while ([result hasPrefix:@"-"]) [result deleteCharactersInRange:NSMakeRange(0, 1)]; while ([result hasSuffix:@"-"]) [result deleteCharactersInRange:NSMakeRange(result.length - 1, 1)]; return result.length > 92 ? [result substringToIndex:92] : result.copy; }
- (NSString *)safeFileName:(NSString *)value { NSMutableString *result = [value.lowercaseString mutableCopy]; [result replaceOccurrencesOfString:@"[^a-z0-9._-]+" withString:@"-" options:NSRegularExpressionSearch range:NSMakeRange(0, result.length)]; while ([result hasPrefix:@"."] || [result hasPrefix:@"-"]) [result deleteCharactersInRange:NSMakeRange(0, 1)]; while ([result hasSuffix:@"."] || [result hasSuffix:@"-"]) [result deleteCharactersInRange:NSMakeRange(result.length - 1, 1)]; return result; }
- (NSString *)uniqueID:(NSString *)slug articles:(NSArray *)articles { for (NSDictionary *item in articles) if ([[self text:item[@"id"]] isEqualToString:slug]) return [NSString stringWithFormat:@"%@-%@", slug, [NSUUID.UUID.UUIDString substringToIndex:8].lowercaseString]; return slug; }
- (NSArray *)parseTags:(NSString *)value { NSMutableArray *tags = [NSMutableArray array]; for (NSString *part in [value componentsSeparatedByString:@","]) if ([self text:part].length) [tags addObject:[self text:part]]; return tags; }
- (NSString *)defaultLocation:(NSString *)category state:(NSString *)state { if (state.length) return state; NSString *topic = [self deriveTopic:category state:state breaking:NO]; NSString *label = [self deriveTopicLabel:topic category:category]; return label.length ? label : @"New England"; }
- (NSString *)defaultVisualLabel:(NSString *)category breaking:(BOOL)breaking developing:(BOOL)developing { if (breaking) return @"Breaking"; if (developing) return @"Developing"; NSString *label = [self deriveTopicLabel:[self deriveTopic:category state:@"" breaking:NO] category:category]; return label.length ? label : [category stringByReplacingOccurrencesOfString:@"-" withString:@" "]; }
- (NSString *)deriveTopic:(NSString *)category state:(NSString *)state breaking:(BOOL)breaking { if (breaking || [category isEqualToString:@"breaking"]) return @"breaking"; if ([category isEqualToString:@"new-england"]) return [state.uppercaseString isEqualToString:@"MA"] ? @"massachusetts" : [state.uppercaseString isEqualToString:@"RI"] ? @"rhode-island" : @""; if ([category isEqualToString:@"more"]) return @"misc"; return [self.allowedCategories containsObject:category] && ![category isEqualToString:@"new-england"] ? category : @""; }
- (NSString *)deriveTopicLabel:(NSString *)topic category:(NSString *)category { NSDictionary *labels = @{ @"new-hampshire": @"New Hampshire", @"massachusetts": @"Massachusetts", @"rhode-island": @"Rhode Island", @"tech": @"Tech", @"markets": @"Markets / Stocks", @"breaking": @"Breaking / Developing", @"misc": @"Misc." }; return labels[topic] ?: ([category isEqualToString:@"new-england"] ? @"New England" : [category isEqualToString:@"more"] ? @"Misc." : @""); }
- (NSString *)normalizeTimestamp:(NSString *)value timezone:(NSString *)timezone error:(NSError **)error { if (!value.length) { if (error) *error = [NSError errorWithDomain:NENErrorDomain code:7 userInfo:@{NSLocalizedDescriptionKey:@"Publication date and time are required."}]; return nil; } NSString *normalized = [self normalizeISO:value]; if (normalized) return normalized; NSDateFormatter *input = [[NSDateFormatter alloc] init]; input.locale = [NSLocale localeWithLocaleIdentifier:@"en_US_POSIX"]; input.timeZone = [NSTimeZone timeZoneWithName:timezone.length ? timezone : @"America/New_York"]; input.dateFormat = @"yyyy-MM-dd'T'HH:mm"; NSDate *date = [input dateFromString:value]; if (!date) { if (error) *error = [NSError errorWithDomain:NENErrorDomain code:7 userInfo:@{NSLocalizedDescriptionKey:@"Publication date and time are invalid."}]; return nil; } return [[self timestampFormatter:timezone] stringFromDate:date]; }
- (NSString *)normalizeISO:(NSString *)value { NSISO8601DateFormatter *formatter = [[NSISO8601DateFormatter alloc] init]; formatter.formatOptions = NSISO8601DateFormatWithInternetDateTime | NSISO8601DateFormatWithDashSeparatorInDate | NSISO8601DateFormatWithColonSeparatorInTime; NSDate *date = [formatter dateFromString:value]; return date ? [[self timestampFormatter:@"America/New_York"] stringFromDate:date] : nil; }
- (NSISO8601DateFormatter *)timestampFormatter:(NSString *)timezone { NSISO8601DateFormatter *formatter = [[NSISO8601DateFormatter alloc] init]; formatter.timeZone = [NSTimeZone timeZoneWithName:timezone.length ? timezone : @"America/New_York"]; formatter.formatOptions = NSISO8601DateFormatWithInternetDateTime | NSISO8601DateFormatWithDashSeparatorInDate | NSISO8601DateFormatWithColonSeparatorInTime; return formatter; }
- (NSString *)localTimestamp { return [[self timestampFormatter:@"America/New_York"] stringFromDate:NSDate.date]; }
- (BOOL)isHTTPURL:(NSString *)value { NSURLComponents *components = [NSURLComponents componentsWithString:value]; return components.host.length && ([components.scheme.lowercaseString isEqualToString:@"http"] || [components.scheme.lowercaseString isEqualToString:@"https"]); }
- (NSString *)urlEncode:(NSString *)value { return [value stringByAddingPercentEncodingWithAllowedCharacters:NSCharacterSet.URLQueryAllowedCharacterSet] ?: value; }
- (NSString *)xmlEscape:(NSString *)value { return [[[[[value stringByReplacingOccurrencesOfString:@"&" withString:@"&amp;"] stringByReplacingOccurrencesOfString:@"<" withString:@"&lt;"] stringByReplacingOccurrencesOfString:@">" withString:@"&gt;"] stringByReplacingOccurrencesOfString:@"\"" withString:@"&quot;"] stringByReplacingOccurrencesOfString:@"'" withString:@"&apos;"]; }
@end

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        NSApplication *application = NSApplication.sharedApplication;
        NENewsPublisher *delegate = [[NENewsPublisher alloc] init];
        application.delegate = delegate;
        [application setActivationPolicy:NSApplicationActivationPolicyRegular];
        [application run];
    }
    return 0;
}
