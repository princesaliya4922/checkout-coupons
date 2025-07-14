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

  // Define your coupon codes here
  const availableCoupons = [
    {
      code: "FLAT400",
      description: "Save 10% on your order",
      type: "percentage",
    },
    {
      code: "FREESHIP",
      description: "Free shipping on orders over $50",
      type: "shipping",
    },
    {
      code: "WELCOME20",
      description: "New customer discount - 20% off",
      type: "percentage",
    },
    {
      code: "BULK15",
      description: "Bulk order discount - 15% off",
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

      // Apply the discount code
      const result = await applyDiscountCodeChange({
        type: "addDiscountCode",
        code: couponCode,
      });

      console.log("Apply discount result:", result);

      if (result.type === "success") {
        setSuccessMessage(`Coupon "${couponCode}" applied successfully!`);
      } else {
        setErrorMessage(
          `Failed to apply coupon "${couponCode}". Please check if the code is valid.`
        );
      }
    } catch (error) {
      console.error("Error applying coupon:", error);
      setErrorMessage(
        `Error applying coupon "${couponCode}". Please try again.`
      );
    } finally {
      // Remove loading state
      setLoadingStates((prev) => ({ ...prev, [couponCode]: false }));
    }
  };

  const isCouponApplied = (couponCode) => {
    return discountCodes.some((discount) => discount.code === couponCode);
  };

  return (
    <BlockStack spacing="base">
      <Text size="medium" emphasis="strong">
        Available Coupon Codes
      </Text>

      {errorMessage && <Banner status="critical">{errorMessage}</Banner>}

      {successMessage && <Banner status="success">{successMessage}</Banner>}

      <BlockStack spacing="tight">
        {availableCoupons.map((coupon) => {
          const isApplied = isCouponApplied(coupon.code);
          const isLoading = loadingStates[coupon.code];

          return (
            <View
              key={coupon.code}
              border="base"
              padding="base"
              borderRadius="base"
            >
              <InlineLayout
                columns={["fill", "auto"]}
                spacing="base"
                blockAlignment="center"
              >
                <BlockStack spacing="extraTight">
                  <Text size="small" emphasis="strong">
                    {coupon.code}
                  </Text>
                  <Text size="small" appearance="subdued">
                    {coupon.description}
                  </Text>
                </BlockStack>

                <Button
                  kind={isApplied ? "secondary" : "primary"}
                  size="small"
                  loading={isLoading}
                  disabled={isApplied}
                  onPress={() => handleApplyCoupon(coupon.code)}
                >
                  {isApplied ? "Applied" : "Apply"}
                </Button>
              </InlineLayout>
            </View>
          );
        })}
      </BlockStack>

      {discountCodes.length > 0 && (
        <BlockStack spacing="extraTight">
          <Text size="small" emphasis="strong">
            Applied Discounts:
          </Text>
          {discountCodes.map((discount) => (
            <Text key={discount.code} size="small" appearance="success">
              ✓ {discount.code}
            </Text>
          ))}
        </BlockStack>
      )}
    </BlockStack>
  );
}
