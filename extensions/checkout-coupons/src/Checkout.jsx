import React, { useState } from "react";
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
} from "@shopify/ui-extensions-react/checkout";

// 1. Choose an extension target
export default reactExtension(
  "purchase.checkout.reductions.render-after",
  () => <Extension />
);

function Extension() {
  const translate = useTranslate();
  const { extension } = useApi();
  const applyDiscountCodeChange = useApplyDiscountCodeChange();
  const discountCodes = useDiscountCodes();
  const [loadingStates, setLoadingStates] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  // Define your coupon codes here - updated to match the image
  const availableCoupons = [
    {
      code: "FLAT400",
      description: "Shop any 2 eligible products at ₹699",
      type: "bundle",
    },
    {
      code: "FLAT300",
      description: "Shop any 3 eligible products at ₹999",
      type: "bundle",
    },
    {
      code: "BUY1199",
      description: "Shop any 4 eligible products at ₹1199",
      type: "bundle",
    },
    {
      code: "FLAT20",
      description: "Get flat 20% OFF on orders above ₹499",
      type: "percentage",
    },
  ];

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
          `Failed to apply coupon "${couponCode}". Please check if the code is valid or if your order meets the requirements.`
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
      <Text size="medium">🎁</Text>
    </View>
  );

  return (
    <BlockStack spacing="base">
      {errorMessage && <Banner status="critical">{errorMessage}</Banner>}
      {successMessage && <Banner status="success">{successMessage}</Banner>}

      <View
        border="base"
        borderRadius="base"
        padding="none"
        background="surface"
      >
        {/* Header Section - Clickable */}
        <Pressable
          onPress={toggleExpanded}
          border="none"
          padding="base"
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

            <ChevronIcon direction={isExpanded ? "up" : "down"} />
          </InlineLayout>
        </Pressable>

        {/* Coupons List - Collapsible */}
        {isExpanded && (
          <View>
            <Divider />
            <BlockStack spacing="none">
              {availableCoupons.map((coupon, index) => {
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
                            Object.values(loadingStates).some((state) => state)
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
              })}
            </BlockStack>
          </View>
        )}
      </View>

      {/* Applied Discounts Section */}
      {discountCodes.length > 0 && (
        <View
          padding="base"
          border="base"
          borderRadius="base"
          background="surface"
        >
          <BlockStack spacing="base">
            <Text size="medium" emphasis="strong">
              Active Discount:
            </Text>
            {discountCodes.map((discount) => (
              <InlineLayout
                key={discount.code}
                spacing="base"
                columns={["auto", "fill", "auto"]}
                blockAlignment="center"
              >
                <Text size="small" appearance="success">
                  ✓
                </Text>
                <BlockStack spacing="extraTight">
                  <Text size="small" emphasis="strong" appearance="success">
                    {discount.code}
                  </Text>
                  {availableCoupons.find((c) => c.code === discount.code)
                    ?.description && (
                    <Text size="extraSmall" appearance="subdued">
                      {
                        availableCoupons.find((c) => c.code === discount.code)
                          .description
                      }
                    </Text>
                  )}
                </BlockStack>
                <Button
                  kind="plain"
                  size="small"
                  loading={loadingStates[`remove-${discount.code}`]}
                  onPress={() => handleRemoveCoupon(discount.code)}
                  accessibilityLabel={`Remove coupon ${discount.code}`}
                >
                  <Text
                    size="small"
                    appearance="critical"
                    decoration="underline"
                  >
                    Remove
                  </Text>
                </Button>
              </InlineLayout>
            ))}
          </BlockStack>
        </View>
      )}
    </BlockStack>
  );
}
