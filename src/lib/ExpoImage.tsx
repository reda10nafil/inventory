// Fase 3: expo-image -> react-native-fast-image / RN Image
import React from 'react';
import { Image as RNImage, ImageProps } from 'react-native';

let FastImage: any = null;
try { FastImage = require('react-native-fast-image').default || require('react-native-fast-image'); } catch {}
let ExpoImage: any = null;
try { ExpoImage = require('expo-image').Image; } catch {}

type Props = ImageProps & { contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'; source?: any };

export function Image(props: Props) {
  const { contentFit, style, source, ...rest } = props;
  const resizeMode = contentFit === 'cover' ? 'cover' : contentFit === 'contain' ? 'contain' : undefined;
  if (FastImage) {
    return <FastImage source={typeof source === 'object' && source.uri ? { uri: source.uri } : source} style={style} resizeMode={FastImage.resizeMode[resizeMode || 'cover']} {...rest} />;
  }
  if (ExpoImage) return <ExpoImage {...props} />;
  return <RNImage source={source} style={style} resizeMode={resizeMode as any} {...rest} />;
}
