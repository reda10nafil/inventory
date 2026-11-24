import React, { useMemo } from 'react';
import { View, ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import { code128Bars } from '../utils/code128';

// Code 128 (set B): lo schema sta in utils/code128.ts (ETI), lo stesso dell'etichetta stampata

interface BarcodeProps {
    value: string;
    width?: number;
    height?: number;
    color?: string;
    backgroundColor?: string;
    style?: ViewStyle;
}

export default function Barcode({
    value,
    width = 300,
    height = 100,
    color,
    backgroundColor,
    style
}: BarcodeProps) {
    const t = useTheme();
    // Inchiostro e carta dei codici: nero su bianco in tutti gli stili
    const ink = color ?? t.colors.qrInk;
    const paper = backgroundColor ?? t.colors.qrPaper;

    const bars = useMemo(() => {
        // Un testo che il Code 128 non scrive (accenti, emoji) non dà barre: meglio nessun codice che uno sbagliato
        const code = code128Bars(value);
        if (!code) return [];
        const unitWidth = width / code.width;
        return code.bars.map((bar) => (
            <Rect
                key={bar.x}
                x={bar.x * unitWidth}
                y={0}
                width={bar.w * unitWidth}
                height={height}
                fill={ink}
            />
        ));
    }, [value, width, height, ink]);

    return (
        <View style={[{ width, height, backgroundColor: paper }, style]}>
            <Svg width={width} height={height}>
                {bars}
            </Svg>
        </View>
    );
}
