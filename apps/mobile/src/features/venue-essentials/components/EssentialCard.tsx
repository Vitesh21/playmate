import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import Card from '@components/ui/Card';
import Badge from '@components/ui/Badge';
import { useTheme } from '@theme/index';
import { formatCurrency } from '@utils/index';
import type { VenueEssential, EssentialType, EssentialPricingModel } from '@playmate/types';

export type EssentialCardProps = {
  essential: VenueEssential;
  selected?: boolean;
  quantity?: number;
  onToggle?: (essential: VenueEssential) => void;
  onIncrement?: (essential: VenueEssential) => void;
  onDecrement?: (essential: VenueEssential) => void;
};

const ESSENTIAL_TYPE_LABEL: Record<EssentialType, string> = {
  RENT: 'Rent',
  SALE: 'Buy',
  ADDON: 'Add-on',
};

const ESSENTIAL_TYPE_BADGE: Record<EssentialType, 'primary' | 'secondary' | 'info'> = {
  RENT: 'primary',
  SALE: 'secondary',
  ADDON: 'info',
};

function unitLabel(pricingModel: EssentialPricingModel, type: EssentialType): string {
  if (pricingModel === 'PER_HOUR') return '/hr';
  if (pricingModel === 'PER_BOOKING') return '/session';
  if (type === 'RENT') return '/rental';
  return '';
}

export const EssentialCard: React.FC<EssentialCardProps> = ({
  essential,
  selected,
  quantity,
  onToggle,
  onIncrement,
  onDecrement,
}) => {
  const { colors, spacing, radius, typography } = useTheme();

  const styles = StyleSheet.create({
    card: {
      flexDirection: 'row',
      marginBottom: spacing.md,
      borderWidth: selected ? 1.5 : 0,
      borderColor: colors.primary[500],
    },
    image: {
      width: 88,
      height: 88,
      borderRadius: radius.md,
      backgroundColor: colors.background.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    imageText: {
      ...typography.h4,
      color: colors.text.tertiary,
    },
    body: {
      flex: 1,
      marginLeft: spacing.md,
      justifyContent: 'space-between',
    },
    title: {
      ...typography.subtitle1,
      color: colors.text.primary,
      marginBottom: spacing.xxs,
    },
    desc: {
      ...typography.caption,
      color: colors.text.tertiary,
      marginBottom: spacing.xs,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    priceRow: {
      alignItems: 'flex-start',
    },
    price: {
      ...typography.subtitle1,
      fontWeight: '700',
      color: colors.text.primary,
    },
    unit: {
      ...typography.caption,
      color: colors.text.tertiary,
    },
    stock: {
      ...typography.caption,
      color: essential.stockQuantity < 3 ? colors.warning[500] : colors.text.tertiary,
      marginTop: spacing.xxs,
    },
    qty: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    qtyBtn: {
      width: 32,
      height: 32,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background.secondary,
      borderWidth: 1,
      borderColor: colors.border.light,
    },
    qtyBtnDisabled: {
      opacity: 0.35,
    },
    qtyText: {
      ...typography.subtitle1,
      fontWeight: '700',
      color: colors.text.primary,
      minWidth: 18,
      textAlign: 'center',
    },
    qtyBtnText: {
      ...typography.h5,
      color: colors.text.secondary,
    },
    badgesRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
  });

  const qty = quantity ?? 0;
  const atMax = qty >= essential.maxPerBooking;
  const atMin = qty <= 0;
  const outOfStock = essential.stockQuantity <= 0;

  return (
    <TouchableOpacity
      onPress={() => !outOfStock && onToggle?.(essential)}
      activeOpacity={0.8}
      disabled={outOfStock}
    >
      <Card elevation="none" variant="outlined" padding="md" style={styles.card}>
        {essential.imageUrl ? (
          <Image
            source={{ uri: essential.imageUrl }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <View style={styles.image}>
            <Text style={styles.imageText}>{essential.name.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.body}>
          <View>
            <View style={styles.badgesRow}>
              <Badge
                label={ESSENTIAL_TYPE_LABEL[essential.type]}
                variant={ESSENTIAL_TYPE_BADGE[essential.type]}
                size="sm"
              />
              {essential.categories.slice(0, 1).map((c) => (
                <Badge key={c} label={c} variant="default" size="sm" />
              ))}
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {essential.name}
            </Text>
            {essential.description ? (
              <Text style={styles.desc} numberOfLines={1}>
                {essential.description}
              </Text>
            ) : null}
          </View>

          <View style={styles.footer}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>
                {formatCurrency(essential.price)}
                <Text style={styles.unit}> {unitLabel(essential.pricingModel, essential.type)}</Text>
              </Text>
              <Text style={styles.stock}>
                {outOfStock
                  ? 'Currently unavailable'
                  : essential.stockQuantity < 3
                  ? `Only ${essential.stockQuantity} left`
                  : `${essential.stockQuantity} in stock`}
              </Text>
            </View>

            <View style={styles.qty}>
              <TouchableOpacity
                style={[styles.qtyBtn, atMin && styles.qtyBtnDisabled]}
                onPress={() => onDecrement?.(essential)}
                disabled={atMin}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyText}>{qty}</Text>
              <TouchableOpacity
                style={[styles.qtyBtn, (atMax || outOfStock) && styles.qtyBtnDisabled]}
                onPress={() => onIncrement?.(essential)}
                disabled={atMax || outOfStock}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

export default EssentialCard;
