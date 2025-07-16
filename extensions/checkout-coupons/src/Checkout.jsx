import React, { useState, useEffect } from "react";
import {
  reactExtension,
  Banner,
  BlockStack,
  Button,
  InlineLayout,
  Text,
  View,
  useApi,
  useApplyDiscountCodeChange,
  useDiscountCodes,
  useTranslate,
  Pressable,
  Divider,
  Icon,
  InlineSpacer,
} from "@shopify/ui-extensions-react/checkout";

// 1. Choose an extension target
export default reactExtension(
  "purchase.checkout.reductions.render-after",
  () => <Extension />
);

function Extension() {
  const translate = useTranslate();
  const { extension, query } = useApi();
  const applyDiscountCodeChange = useApplyDiscountCodeChange();
  const discountCodes = useDiscountCodes();
  const [loadingStates, setLoadingStates] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(true);

  // Fallback placeholder coupons
  const fallbackCoupons = [
    {
      code: "SAVE20",
      description: "Get 20% off on your order",
      type: "percentage",
    },
    {
      code: "FLAT400",
      description: "Flat ₹100 off on orders above ₹500",
      type: "fixed",
    },
    {
      code: "WELCOME10",
      description: "Welcome offer - 10% off for new customers",
      type: "percentage",
    },
  ];

  // Fetch coupons from metaobject
  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        setCouponsLoading(true);

        // GraphQL query to fetch metaobject entries
        const queryString = `
          query {
            metaobjects(type: "coupon_codes", first: 20) {
              edges {
                node {
                  id
                  fields {
                    key
                    value
                  }
                }
              }
            }
          }
        `;

        const response = await query(queryString);

        if (response?.data?.metaobjects?.edges) {
          const coupons = response.data.metaobjects.edges
            .map(({ node }) => {
              const fields = node.fields.reduce((acc, field) => {
                acc[field.key] = field.value;
                return acc;
              }, {});

              return {
                code: fields.code || "",
                description: fields.description || "",
                type: fields.type || "general",
                active: fields.active !== false, // Default to true if not specified
              };
            })
            .filter((coupon) => coupon.active && coupon.code); // Only show active coupons with valid codes

          // If we have coupons from metaobject, use them
          if (coupons.length > 0) {
            setAvailableCoupons(coupons);
          } else {
            // No coupons found in metaobject, use fallback
            console.log(
              "No coupons found in metaobject, using fallback coupons"
            );
            setAvailableCoupons(fallbackCoupons);
          }
        } else {
          // Invalid response structure, use fallback
          console.log("Invalid metaobject response, using fallback coupons");
          setAvailableCoupons(fallbackCoupons);
        }
      } catch (error) {
        console.error("Error fetching coupons:", error);
        console.log("Failed to fetch from metaobject, using fallback coupons");

        // On error, use fallback coupons
        setAvailableCoupons(fallbackCoupons);
      } finally {
        setCouponsLoading(false);
      }
    };

    fetchCoupons();
  }, [query]);

  const handleApplyCoupon = async (couponCode) => {
    // Clear previous messages
    setErrorMessage("");
    setSuccessMessage("");

    // Set loading state for this specific coupon
    setLoadingStates((prev) => ({ ...prev, [couponCode]: true }));

    try {
      // Check if coupon is already applied
      const isAlreadyApplied = discountCodes.some(
        (discount) => discount.code === couponCode
      );

      if (isAlreadyApplied) {
        setErrorMessage(`Coupon "${couponCode}" is already applied!`);
        setLoadingStates((prev) => ({ ...prev, [couponCode]: false }));
        return;
      }

      // If there are existing discount codes, remove them first
      if (discountCodes.length > 0) {
        console.log("Removing existing discount codes...");

        // Remove all existing discount codes
        for (const existingDiscount of discountCodes) {
          try {
            const removeResult = await applyDiscountCodeChange({
              type: "removeDiscountCode",
              code: existingDiscount.code,
            });
            console.log(
              `Removed discount code: ${existingDiscount.code}`,
              removeResult
            );
          } catch (removeError) {
            console.error(
              `Error removing discount code ${existingDiscount.code}:`,
              removeError
            );
          }
        }

        // Small delay to ensure removal is processed
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Apply the new discount code
      const result = await applyDiscountCodeChange({
        type: "addDiscountCode",
        code: couponCode,
      });

      console.log("Apply discount result:", result);

      if (result.type === "success") {
        setSuccessMessage(`Coupon "${couponCode}" applied successfully!`);

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
      } else {
        // If the new coupon fails, try to reapply the previous one if any
        if (discountCodes.length > 0 && discountCodes[0].code) {
          try {
            await applyDiscountCodeChange({
              type: "addDiscountCode",
              code: discountCodes[0].code,
            });
          } catch (reapplyError) {
            console.error("Error reapplying previous coupon:", reapplyError);
          }
        }

        setErrorMessage(
          `"${couponCode}" discount code is not applicable on this order.`
        );

        // Clear error message after 5 seconds
        setTimeout(() => {
          setErrorMessage("");
        }, 5000);
      }
    } catch (error) {
      console.error("Error applying coupon:", error);
      setErrorMessage(
        `Error applying coupon "${couponCode}". Please try again.`
      );

      // Clear error message after 5 seconds
      setTimeout(() => {
        setErrorMessage("");
      }, 5000);
    } finally {
      // Remove loading state
      setLoadingStates((prev) => ({ ...prev, [couponCode]: false }));
    }
  };

  const handleRemoveCoupon = async (couponCode) => {
    setLoadingStates((prev) => ({ ...prev, [`remove-${couponCode}`]: true }));

    try {
      const result = await applyDiscountCodeChange({
        type: "removeDiscountCode",
        code: couponCode,
      });

      if (result.type === "success") {
        setSuccessMessage(`Coupon "${couponCode}" removed successfully!`);
        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
      }
    } catch (error) {
      console.error("Error removing coupon:", error);
      setErrorMessage(`Error removing coupon "${couponCode}".`);
      setTimeout(() => {
        setErrorMessage("");
      }, 5000);
    } finally {
      setLoadingStates((prev) => ({
        ...prev,
        [`remove-${couponCode}`]: false,
      }));
    }
  };

  const isCouponApplied = (couponCode) => {
    return discountCodes.some((discount) => discount.code === couponCode);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Custom chevron icon component with proper alignment
  const ChevronIcon = ({ direction }) => (
    <View>
      <Text size="large" appearance="subdued">
        {direction === "down" ? "˅" : "˄"}
      </Text>
    </View>
  );

  // Gift box icon
  const GiftIcon = () => (
    <View>
      <Text size="medium">
        <Icon source="gift" />
      </Text>
    </View>
  );

  // Don't render if there are no coupons (both metaobject and fallback are empty)
  if (!couponsLoading && availableCoupons.length === 0) {
    return null;
  }

  if (availableCoupons.length === 0) {
    return;
  }

  return (
    <BlockStack spacing="base">
      {errorMessage && <Banner status="critical">{errorMessage}</Banner>}
      {successMessage && <Banner status="success">{successMessage}</Banner>}

      <View
        border="base"
        borderRadius="base"
        padding="base"
        background="surface"
      >
        {/* Header Section - Clickable */}
        <InlineLayout
          spacing="base"
          blockAlignment="center"
          columns={["fill", "auto"]}
        >
          <Pressable
            onPress={toggleExpanded}
            border="none"
            padding="none"
            borderRadius="base"
          >
            <InlineLayout
              columns={["auto", "fill", "auto"]}
              spacing="base"
              blockAlignment="center"
            >
              <GiftIcon />

              <Text size="medium" emphasis="strong">
                All coupons
              </Text>
            </InlineLayout>
          </Pressable>
          <View padding="none">
            {isExpanded ? (
              <Icon source="chevronUp" />
            ) : (
              <Icon source="chevronDown" />
            )}
          </View>
        </InlineLayout>

        {/* Coupons List - Collapsible */}
        {isExpanded && (
          <View padding="none" background="surface">
            {/* <Divider /> */}
            <InlineSpacer spacing="tight" />
            <View border="base" padding="none" background="surface">
              <BlockStack spacing="none">
                {couponsLoading ? (
                  <View padding="base">
                    <Text size="medium" appearance="subdued">
                      Loading coupons...
                    </Text>
                  </View>
                ) : availableCoupons.length === 0 ? (
                  <View padding="base">
                    <Text size="medium" appearance="subdued">
                      No coupons available at this time.
                    </Text>
                  </View>
                ) : (
                  availableCoupons.map((coupon, index) => {
                    const isApplied = isCouponApplied(coupon.code);
                    const isLoading = loadingStates[coupon.code];

                    return (
                      <View key={coupon.code}>
                        {index > 0 && <Divider />}

                        <View padding="base">
                          <InlineLayout
                            columns={["fill", "auto"]}
                            spacing="base"
                            blockAlignment="center"
                          >
                            <BlockStack spacing="extraTight">
                              <Text size="medium" emphasis="strong">
                                {coupon.code}
                              </Text>
                              <Text size="small" appearance="subdued">
                                {coupon.description}
                              </Text>
                            </BlockStack>

                            <Button
                              kind="plain"
                              size="medium"
                              loading={isLoading}
                              disabled={
                                isApplied ||
                                Object.values(loadingStates).some(
                                  (state) => state
                                )
                              }
                              onPress={() => handleApplyCoupon(coupon.code)}
                              accessibilityLabel={`Apply coupon ${coupon.code}`}
                            >
                              <Text
                                size="medium"
                                emphasis="strong"
                                appearance={isApplied ? "success" : "info"}
                                decoration={isApplied ? "none" : "underline"}
                              >
                                {isApplied ? "Applied ✓" : "Apply"}
                              </Text>
                            </Button>
                          </InlineLayout>
                        </View>
                      </View>
                    );
                  })
                )}
              </BlockStack>
            </View>
          </View>
        )}
      </View>
    </BlockStack>
  );
}
