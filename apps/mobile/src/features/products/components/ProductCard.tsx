import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import Card from '@components/ui/Card';
import { useTheme } from '@theme/index';
import type { Product } from '@playmate/types';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const coverImage = product.images?.[0];

  const s = StyleSheet.create({
    touchable: { flex: 1, margin: spacing.xs },
    card: { overflow: 'hidden', height: '100%' },
    imageWrap: { position: 'relative', aspectRatio: 1, width: '100%' },
    image: { width: '100%', height: '100%' },
    placeholder: {
      backgroundColor: colors.neutral[100] ?? colors.background.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderText: { ...typography.h2, color: colors.neutral[400] ?? colors.text.tertiary },
    ratingBadge: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      backgroundColor: colors.background.primary,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
      borderRadius: radius.full,
      shadowColor: '#000',
      shadowOpacity: colors.text.primary === '#EAE7E1' ? 0.3 : 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
    },
    ratingText: { ...typography.caption, fontWeight: '700', color: colors.warning[600] ?? colors.warning[500] },
    content: { padding: spacing.sm },
    brand: { ...typography.overline, color: colors.text.tertiary, marginBottom: 2 },
    name: {
      ...typography.body2,
      color: colors.text.primary,
      fontWeight: '500',
      marginBottom: 2,
      minHeight: 44,
    },
    reviews: { ...typography.caption, color: colors.text.tertiary },
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={s.touchable}>
      <Card elevation="sm" padding="none" style={s.card}>
        <View style={s.imageWrap}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={s.image} contentFit="cover" />
          ) : (
            <View style={[s.image, s.placeholder]}>
              <Text style={s.placeholderText}>{product.name.charAt(0)}</Text>
            </View>
          )}
          {product.averageRating ? (
            <View style={s.ratingBadge}>
              <Text style={s.ratingText}>★ {product.averageRating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
        <View style={s.content}>
          {product.brand ? (
            <Text style={s.brand} numberOfLines={1}>
              {product.brand}
            </Text>
          ) : null}
          <Text style={s.name} numberOfLines={2}>
            {product.name}
          </Text>
          {product.reviewCount > 0 ? <Text style={s.reviews}>{product.reviewCount} reviews</Text> : null}
        </View>
      </Card>
    </TouchableOpacity>
  );
};

export default ProductCard;
