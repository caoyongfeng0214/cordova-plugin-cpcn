//
//  JWTBase64Coder.m
//  Pods
//
//  Created by Lobanov Dmitry on 05.10.16.
//
//

#import "CodePushJWTBase64Coder.h"

@interface JWTBase64Coder (ConditionLinking)
+ (BOOL)isBase64AddtionsAvailable;
@end

@implementation JWTBase64Coder (ConditionLinking)
+ (BOOL)isBase64AddtionsAvailable {
    return [[NSData class] respondsToSelector:@selector(dataWithBase64UrlEncodedString:)];
}
@end

#if __has_include(<Base64/MF_Base64Additions.h>)
#import <Base64/MF_Base64Additions.h>
#elif __has_include("CodePushMF_Base64Additions.h")
#import "CodePushMF_Base64Additions.h"
#endif

@implementation JWTBase64Coder

+ (NSString *)base64UrlEncodedStringWithData:(NSData *)data {
    if ([self isBase64AddtionsAvailable] && [data respondsToSelector:@selector(base64UrlEncodedString)]) {
        return [data performSelector:@selector(base64UrlEncodedString)];
    }
    else {
        return [data base64EncodedStringWithOptions:0];
    }
}

+ (NSData *)dataWithBase64UrlEncodedString:(NSString *)urlEncodedString {
    if ([self isBase64AddtionsAvailable] && [[NSData class] respondsToSelector:@selector(dataWithBase64UrlEncodedString:)]) {
        return [[NSData class] performSelector:@selector(dataWithBase64UrlEncodedString:) withObject:urlEncodedString];
    }
    else {
        return [[NSData alloc] initWithBase64EncodedString:urlEncodedString options:0];
    }
}

+ (NSData *)dataWithString:(NSString *)string {
    // check if base64.
    if (string == nil) {
        return nil;
    }
    
    // check that string is base64 encoded
    NSData *data = [[NSData alloc] initWithBase64EncodedString:string options:0];
    
    NSString *stringToPass = data != nil ? string : [[string dataUsingEncoding:NSUTF8StringEncoding] base64EncodedStringWithOptions:0];
    
    NSData *result = [self dataWithBase64UrlEncodedString:stringToPass];
    return result;
}

+ (NSString *)stringWithData:(NSData *)data {
    return [self.class base64UrlEncodedStringWithData:data];
}

@end

@implementation JWTBase64Coder (JWTStringCoder__Protocol)
- (NSString *)stringWithData:(NSData *)data {
    return [self.class stringWithData:data];
}
- (NSData *)dataWithString:(NSString *)string {
    return [self.class dataWithString:string];
}
@end

@implementation JWTStringCoder__For__Encoding
+ (instancetype)utf8Encoding {
    JWTStringCoder__For__Encoding *coding = [self new];
    coding.stringEncoding = NSUTF8StringEncoding;
    return coding;
}
@end
@implementation JWTStringCoder__For__Encoding (JWTStringCoder__Protocol)
- (NSString *)stringWithData:(NSData *)data {
    return [[NSString alloc] initWithData:data encoding:self.stringEncoding];
}
- (NSData *)dataWithString:(NSString *)string {
    return [string dataUsingEncoding:self.stringEncoding];
}
@end
