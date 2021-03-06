/*
 * The purpose of the Help scene is to give users a consistent place within
 * webOS apps to find publisher information, support contact information and 
 * help resources.
 * 
 * We intend to provide framework-level support for the Help scene in a future
 * SDK release. For now, you'll need to manually add the Help scene and hook it
 * up to your app's Help menu item.
 * 
 * The contents of the Help scene are determined by the fields provided in this
 * file. Required fields are noted below. For most fields, UI labels are
 * automatically generated; the Help Resources are the exception to this rule.
 * 
 * Help resources may take various forms (help topics, FAQs, tips, rules,
 * tutorials, etc.). As far as the Help scene is concerned, a help resource is
 * defined by a UI label describing the resource and either a scene name (if the
 * resource is included as a scene in the app itself) or a URL (if the resource
 * is to be viewed in the webOS browser). You may provide any number of help
 * resources, or none at all.
 */

// Required
_APP_Name = Mojo.appInfo.title;
_APP_VersionNumber = Mojo.appInfo.version;
_APP_PublisherName = Mojo.appInfo.vendor;
_APP_Copyright = '&copy; Copyright 2010 BlockChalk, Inc.';

// At least one of these three is required
_APP_Support_URL = 'blog.blockchalk.com';   // label = Support Website
_APP_Support_Email = 'blockchalk+palmwebos@gmail.com';        // label = Send Email

// Optional
_APP_Publisher_URL = 'blockchalk.com'; // label = _APP_PublisherName + Website

_APP_Help_Resource = [
    { type: 'scene', label: 'Instructions / About', sceneName: 'instructions' },
    { type: 'web', label: 'Community Guidelines', url: 'blockchalk.com/community'},
    { type: 'web', label: 'Terms of Service', url: 'blockchalk.com/terms'},
    { type: 'web', label: 'Privacy Policy', url: 'blockchalk.com/privacy'},
    { type: 'web', label: 'Source Code', url: 'github.com/lmorchard/blockchalk-webos/'}
];

_APP_Support_Resource = [
    { text: 'Email Support', detail: 'support-palm@blockchalk.com', 
        Class:$L("img_email"), type:'email' },
    { text: 'Share Your Feedback', detail: 'feedback-palm@blockchalk.com', 
        Class:$L("img_email"), type:'email' },
    { text: 'Follow Us On Twitter', detail: 'mobile.twitter.com/blockchalk', 
        Class:$L("img_web"), type:'web' },
    { text: 'Read Our Blog', detail: 'blog.blockchalk.com', 
        Class:$L("img_web"), type:'web' },
    { text: 'BlockChalk Web Site', detail: 'blockchalk.com', 
        Class:$L("img_web"), type:'web' }
];
