import React, { useState, useEffect } from 'react';
import './VariationSelector.css';

interface VariationSpecifics {
    [key: string]: string;
}

interface HardwareVariation {
    id: number;
    ebayItemId: string;
    title: string;
    price: string;
    originalPrice?: string;
    discount: string;
    condition: string;
    dealScore: number;
    variationSpecifics: VariationSpecifics | null;
    sellerInfo: {
        username: string;
        feedbackPercentage: number;
        feedbackScore: number;
    } | null;
    shippingCost: string;
}

interface VariationSelectorProps {
    hardwareId: number;
    onVariationSelect?: (variation: HardwareVariation) => void;
}

const VariationSelector: React.FC<VariationSelectorProps> = ({ hardwareId, onVariationSelect }) => {
    const [variations, setVariations] = useState<HardwareVariation[]>([]);
    const [selectedVariation, setSelectedVariation] = useState<HardwareVariation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasVariations, setHasVariations] = useState(false);

    useEffect(() => {
        fetchVariations();
    }, [hardwareId]);

    const fetchVariations = async () => {
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:5000/api/hardware/${hardwareId}/variations`);

            if (!response.ok) {
                throw new Error('Failed to fetch variations');
            }

            const data = await response.json();
            setVariations(data.variations || []);
            setHasVariations(data.hasVariations || false);

            // Select the first (best) variation by default
            if (data.variations && data.variations.length > 0) {
                const best = data.variations[0];
                setSelectedVariation(best);
                if (onVariationSelect) {
                    onVariationSelect(best);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const handleVariationChange = (variation: HardwareVariation) => {
        setSelectedVariation(variation);
        if (onVariationSelect) {
            onVariationSelect(variation);
        }
    };

    // Extract unique attribute names from all variations
    const getAttributeOptions = () => {
        const attributes: { [key: string]: Set<string> } = {};

        variations.forEach(v => {
            if (v.variationSpecifics) {
                Object.entries(v.variationSpecifics).forEach(([key, value]) => {
                    if (!attributes[key]) {
                        attributes[key] = new Set();
                    }
                    attributes[key].add(value);
                });
            }
        });

        return attributes;
    };

    if (loading) {
        return <div className="variation-selector loading">Loading options...</div>;
    }

    if (error) {
        return <div className="variation-selector error">Error: {error}</div>;
    }

    if (!hasVariations || variations.length <= 1) {
        return null; // Don't show selector if there's only one option
    }

    const attributeOptions = getAttributeOptions();

    return (
        <div className="variation-selector">
            <h3>Select Configuration</h3>

            {/* Show attribute filters if available */}
            {Object.keys(attributeOptions).length > 0 && (
                <div className="attribute-filters">
                    {Object.entries(attributeOptions).map(([attrName, values]) => (
                        <div key={attrName} className="attribute-group">
                            <label>{attrName}:</label>
                            <div className="attribute-options">
                                {Array.from(values).map(value => {
                                    const isSelected = selectedVariation?.variationSpecifics?.[attrName] === value;
                                    return (
                                        <button
                                            key={value}
                                            className={`attribute-option ${isSelected ? 'selected' : ''}`}
                                            onClick={() => {
                                                // Find variation with this attribute value
                                                const matchingVar = variations.find(v =>
                                                    v.variationSpecifics?.[attrName] === value
                                                );
                                                if (matchingVar) {
                                                    handleVariationChange(matchingVar);
                                                }
                                            }}
                                        >
                                            {value}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Show selected variation details */}
            {selectedVariation && (
                <div className="selected-variation-details">
                    <div className="variation-price">
                        <span className="current-price">{selectedVariation.price}</span>
                        {selectedVariation.originalPrice && (
                            <span className="original-price">{selectedVariation.originalPrice}</span>
                        )}
                        {selectedVariation.discount && (
                            <span className="discount-badge">{selectedVariation.discount}</span>
                        )}
                    </div>
                    <div className="variation-meta">
                        <span className="condition">{selectedVariation.condition}</span>
                        <span className="shipping">{selectedVariation.shippingCost}</span>
                    </div>
                </div>
            )}

            {/* Show all variations as a comparison table */}
            <details className="variations-table-wrapper">
                <summary>Compare All {variations.length} Options</summary>
                <div className="variations-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Configuration</th>
                                <th>Price</th>
                                <th>Condition</th>
                                <th>Shipping</th>
                                <th>Seller</th>
                                <th>Score</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {variations.map(variation => (
                                <tr
                                    key={variation.id}
                                    className={selectedVariation?.id === variation.id ? 'selected-row' : ''}
                                >
                                    <td>
                                        {variation.variationSpecifics ? (
                                            <div className="specs">
                                                {Object.entries(variation.variationSpecifics).map(([key, value]) => (
                                                    <span key={key} className="spec-item">
                                                        {key}: {value}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="no-specs">Standard</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="price-cell">
                                            <strong>{variation.price}</strong>
                                            {variation.discount && (
                                                <span className="discount-small">{variation.discount}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>{variation.condition}</td>
                                    <td>{variation.shippingCost}</td>
                                    <td>
                                        {variation.sellerInfo && (
                                            <div className="seller-cell">
                                                <span>{variation.sellerInfo.username}</span>
                                                <span className="feedback">
                                                    {variation.sellerInfo.feedbackPercentage}% ({variation.sellerInfo.feedbackScore})
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <span className="deal-score">{variation.dealScore}</span>
                                    </td>
                                    <td>
                                        <button
                                            className="select-btn"
                                            onClick={() => handleVariationChange(variation)}
                                        >
                                            {selectedVariation?.id === variation.id ? 'Selected' : 'Select'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </details>
        </div>
    );
};

export default VariationSelector;
