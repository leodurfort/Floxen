import { Product } from '@prisma/client';

export type FieldSource = 'manual' | 'ai';

export interface SelectedSources {
  title?: FieldSource;
  description?: FieldSource;
  category?: FieldSource;
  keywords?: FieldSource;
  q_and_a?: FieldSource;
}

export interface ResolvedValues {
  title: string;
  description: string | null;
  category: string | null;
  keywords: string[];
  qAndA: Array<{ q: string; a: string }> | null;
}

/**
 * Resolves the final value for each enrichable field based on user's source selection.
 *
 * Priority logic:
 * 1. If selectedSources.field === "ai" && AI value exists → use AI value
 * 2. Else if selectedSources.field === "manual" && manual value exists → use manual value
 * 3. Else → fallback to WooCommerce original value
 *
 * Note: Selected source is the authority. If AI is selected, use AI even if manual edit exists.
 */
export class FeedValueResolver {
  private product: Product;
  private selectedSources: SelectedSources;

  constructor(product: Product) {
    this.product = product;
    this.selectedSources = this.parseSelectedSources(product.selectedSources);
  }

  /**
   * Parse the selectedSources JSON field with defaults
   */
  private parseSelectedSources(sources: any): SelectedSources {
    if (!sources || typeof sources !== 'object') {
      return this.getDefaultSources();
    }

    return {
      title: sources.title || 'manual',
      description: sources.description || 'manual',
      category: sources.category || 'manual',
      keywords: sources.keywords || 'manual',
      q_and_a: sources.q_and_a || 'manual',
    };
  }

  /**
   * Default to manual source for all fields
   */
  private getDefaultSources(): SelectedSources {
    return {
      title: 'manual',
      description: 'manual',
      category: 'manual',
      keywords: 'manual',
      q_and_a: 'manual',
    };
  }

  /**
   * Resolve title field
   */
  resolveTitle(): string {
    const source = this.selectedSources.title;

    // If AI is selected and AI value exists, use it
    if (source === 'ai' && this.product.aiTitle) {
      return this.product.aiTitle;
    }

    // If manual is selected and manual value exists, use it
    if (source === 'manual' && this.product.manualTitle) {
      return this.product.manualTitle;
    }

    // Fallback to WooCommerce original
    return this.product.wooTitle;
  }

  /**
   * Resolve description field
   */
  resolveDescription(): string | null {
    const source = this.selectedSources.description;

    if (source === 'ai' && this.product.aiDescription) {
      return this.product.aiDescription;
    }

    if (source === 'manual' && this.product.manualDescription) {
      return this.product.manualDescription;
    }

    return this.product.wooDescription || null;
  }

  /**
   * Resolve category field
   */
  resolveCategory(): string | null {
    const source = this.selectedSources.category;

    if (source === 'ai' && this.product.aiSuggestedCategory) {
      return this.product.aiSuggestedCategory;
    }

    if (source === 'manual' && this.product.manualCategory) {
      return this.product.manualCategory;
    }

    // Extract first category from wooCategories JSON
    if (this.product.wooCategories && Array.isArray(this.product.wooCategories)) {
      const categories = this.product.wooCategories as any[];
      if (categories.length > 0 && categories[0].name) {
        return categories[0].name;
      }
    }

    return null;
  }

  /**
   * Resolve keywords field
   */
  resolveKeywords(): string[] {
    const source = this.selectedSources.keywords;

    if (source === 'ai' && this.product.aiKeywords && this.product.aiKeywords.length > 0) {
      return this.product.aiKeywords;
    }

    if (source === 'manual' && this.product.manualKeywords && this.product.manualKeywords.length > 0) {
      return this.product.manualKeywords;
    }

    // No WooCommerce fallback for keywords
    return [];
  }

  /**
   * Resolve Q&A field
   */
  resolveQAndA(): Array<{ q: string; a: string }> | null {
    const source = this.selectedSources.q_and_a;

    if (source === 'ai' && this.product.aiQAndA) {
      return this.product.aiQAndA as Array<{ q: string; a: string }>;
    }

    if (source === 'manual' && this.product.manualQAndA) {
      return this.product.manualQAndA as Array<{ q: string; a: string }>;
    }

    // No WooCommerce fallback for Q&A
    return null;
  }

  /**
   * Resolve all enrichable fields at once
   */
  resolveAll(): ResolvedValues {
    return {
      title: this.resolveTitle(),
      description: this.resolveDescription(),
      category: this.resolveCategory(),
      keywords: this.resolveKeywords(),
      qAndA: this.resolveQAndA(),
    };
  }

  /**
   * Get the current selected sources
   */
  getSelectedSources(): SelectedSources {
    return this.selectedSources;
  }
}
