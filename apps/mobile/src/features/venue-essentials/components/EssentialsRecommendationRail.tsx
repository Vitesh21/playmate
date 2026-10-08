import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@theme/index';
import Badge from '@components/ui/Badge';
import { formatCurrency } from '@utils/index';
import type {
  EssentialRecommendation,
  VenueEssential,
} from '@playmate/types';

type Props = {
  recommendations: EssentialRecommendation[];
  loading?: boolean;
  onAdd: (essential: VenueEssential) => void;
  onShowAll: () => void;
};

export const EssentialsRecommendationRail: React.FC<Props> = ({
  recommendations,
  loading,
  onAdd,
  onShowAll,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const sorted = [...recommendations].sort((a, b) => b.weight - a.weight);

  const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    title: {
      ...typography.h5,
      color: colors.text.primary,
    },
    subtitle: {
      ...typography.caption,
      color: colors.text.tertiary,
      marginTop: 2,
    },
    showAll: {
      ...typography.subtitle2,
      color: colors.primary[600],
    },
    rail: {
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
    },
    tile: {
      width: 148,
      borderRadius: radius.lg,
      backgroundColor: colors.background.primary,
      borderWidth: 1,
      borderColor: colors.border.light,
      overflow: 'hidden',
    },
    thumb: {
      height: 96,
      backgroundColor: colors.background.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbText: {
      ...typography.h3,
      color: colors.text.tertiary,
    },
    tileBody: {
      padding: spacing.sm,
    },
    tileBadge: {
      position: 'absolute',
      top: spacing.xs,
      left: spacing.xs,
    },
    name: {
      ...typography.body2,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: spacing.xxs,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    price: {
      ...typography.subtitle2,
      fontWeight: '700',
      color: colors.text.primary,
    },
    addBtn: {
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.primary[600],
    },
    addBtnDisabled: {
      opacity: 0.5,
    },
    addBtnText: {
      ...typography.caption,
      fontWeight: '700',
      color: colors.text.inverse,
    },
    recBadge: {
      position: 'absolute',
      top: spacing.xs,
      right: spacing.xs,
    },
    empty: {
      paddingVertical: spacing.lg,
      alignItems: 'center',
    },
    emptyText: {
      ...typography.body2,
      color: colors.text.tertiary,
    },
  });

  if (!loading && sorted.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No rental gear available at this venue yet.</Text>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Need gear? We'll bring it.</Text>
          <Text style={styles.subtitle}>Rent rackets, shuttles & more — delivered to your court.</Text>
        </View>
        <TouchableOpacity onPress={onShowAll}>
          <Text style={styles.showAll}>See all</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {sorted.map((rec) => {
          const e = rec.essential;
          const outOfStock = e.stockQuantity <= 0;
          return (
            <View key={e.id} style={styles.tile}>
              <View style={styles.thumb}>
                <Text style={styles.thumbText}>{e.name.charAt(0)}</Text>
              </View>
              <Badge
                label={e.type === 'RENT' ? 'RENT' : e.type === 'SALE' ? 'BUY' : 'ADD-ON'}
                variant={e.type === 'RENT' ? 'primary' : e.type === 'SALE' ? 'secondary' : 'info'}
                size="sm"
                style={styles.tileBadge}
              />
              {rec.badge ? (
                <Badge label={rec.badge} variant="warning" size="sm" style={styles.recBadge} />
              ) : null}
              <View style={styles.tileBody}>
                <Text style={styles.name} numberOfLines={2}>
                  {e.name}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>{formatCurrency(e.price)}</Text>
                  <TouchableOpacity
                    style={[styles.addBtn, outOfStock && styles.addBtnDisabled]}
                    onPress={() => !outOfStock && onAdd(e)}
                    disabled={outOfStock}
                  >
                    <Text style={styles.addBtnText}>{outOfStock ? 'Sold out' : 'Add'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default EssentialsRecommendationRail;
