import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import Card from '@components/ui/Card';
import Badge from '@components/ui/Badge';
import { colors, spacing, radius, typography } from '@theme/index';
import { formatCurrency } from '@utils/index';
import type { Product } from '@playmate/types';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => {
  const coverImage = product.images?.[0];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.touchable}>
      <Card elevation="sm" padding="none" style={styles.card}>
        <View style={styles.imageWrapper}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={[styles.image, styles.placeholderImage]}>
              <Text style={styles.placeholderText}>{product.name.charAt(0)}</Text>
            </View>
          )}
          {product.averageRating && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>★ {product.averageRating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        <View style={styles.content}>
          {product.brand && (
            <Text style={styles.brand} numberOfLines={1}>
              {product.brand}
            </Text>
          )}
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>
          {product.reviewCount > 0 && (
            <Text style={styles.reviews}>{product.reviewCount} reviews</Text>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
    margin: spacing.xs,
  },
  card: {
    overflow: 'hidden',
    height: '100%',
  },
  imageWrapper: {
    position: 'relative',
    aspectRatio: 1,
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    ...typography.h2,
    color: colors.neutral[400],
  },
  ratingBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  ratingText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.warning[600],
  },
  content: {
    padding: spacing.sm,
  },
  brand: {
    ...typography.overline,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  name: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '500',
    marginBottom: 2,
    minHeight: 44,
  },
  reviews: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
});

export default ProductCard;
