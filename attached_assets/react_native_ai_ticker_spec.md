# Production-Grade Visual Ticker System & AI Prompt Specification

## 1. Architecture Overview
Hệ thống Visual Ticker cho React Native kết hợp **Structured Prompt Engineering** để biến các thao tác chạm (UI interaction) thành dữ liệu ngữ cảnh (Visual Metadata) có độ chính xác cao cho các mô hình AI Multimodal (Gemini Vision / GPT-4o).

---

## 2. React Native Production Component (`VisualTickerGrid.tsx`)

### Characteristics:
- **TypeScript Strictly Typed**: An toàn kiểu dữ liệu.
- **Haptic Feedback**: Phản hồi xúc giác khi bấm (`expo-haptics`).
- **Accessibility Ready**: Đạt chuẩn WCAG cho Mobile.
- **Performance**: Tối ưu re-render với `React.memo` và `useCallback`.

```tsx
import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

export type TickerShapeType = 'pill' | 'warning' | 'tag';

export interface VisualTickerItem {
  id: string;
  shapeType: TickerShapeType;
  label: string;
  icon: string;
  aiTag: string; // Token chuẩn hóa gửi cho AI
  bgColor: string;
  borderColor: string;
  textColor: string;
}

interface VisualTickerProps {
  items: VisualTickerItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export const VisualTickerGrid: React.FC<VisualTickerProps> = React.memo(({
  items,
  selectedIds,
  onToggle,
  containerStyle,
}) => {
  const handlePress = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(id);
  }, [onToggle]);

  return (
    <View style={[styles.gridContainer, containerStyle]}>
      {items.map((item) => {
        const isSelected = selectedIds.includes(item.id);
        const shapeStyle = getShapeStyle(item.shapeType);

        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.7}
            onPress={() => handlePress(item.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={`${item.label}, Ticker`}
            style={[
              styles.baseTicker,
              shapeStyle,
              {
                backgroundColor: item.bgColor,
                borderColor: item.borderColor,
              },
              isSelected && styles.selectedState,
            ]}
          >
            <Text style={styles.iconText}>{item.icon}</Text>
            <Text style={[styles.labelText, { color: item.textColor }]}>
              {item.label}
            </Text>
            {isSelected && (
              <View style={styles.badgeCheck}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const getShapeStyle = (shapeType: TickerShapeType) => {
  switch (shapeType) {
    case 'pill':
      return styles.pillShape;
    case 'warning':
      return styles.warningShape;
    case 'tag':
    default:
      return styles.tagShape;
  }
};

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
  },
  baseTicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  pillShape: {
    borderRadius: 24,
  },
  warningShape: {
    borderRadius: 10,
    borderWidth: 2,
  },
  tagShape: {
    borderRadius: 6,
    borderStyle: 'dashed',
  },
  selectedState: {
    transform: [{ scale: 1.03 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  iconText: {
    fontSize: 16,
    marginRight: 6,
  },
  labelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  badgeCheck: {
    marginLeft: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  checkMark: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});
```

---

## 3. Tối ưu hóa System Prompt cho AI Model (Prompt Engineering)

Để AI hiểu các `aiTag` mà không bị hiện tượng ảo giác (hallucination), hệ thống cần áp dụng kĩ thuật **XML-like Tag Wrapping** và **Ground Truth Anchoring**.

### System Prompt Template (Gửi cho LLM/Vision API):

```text
SYSTEM ROLE:
You are an expert AI Quality Inspector and Vision Analyst. 
Your task is to evaluate the user-provided image by strictly cross-referencing visual features with structural user tags (Visual Tickers) and user notes.

INPUT STRUCTURE:
1. [Visual Context]: The attached image file.
2. [Visual Tickers]: Semantic tags manually attached by the user.
3. [User Note]: Additional textual descriptions.

TAG TAXONOMY & INTERPRETATION RULES:
- [ISSUE: Damaged/Broken] -> Focus spatial reasoning on cracks, fractures, or structural breakage in the image.
- [STATUS: Second-hand/Worn out] -> Analyze surface wear, scratches, fading, or signs of usage.
- [STATUS: Unboxed/Opened] -> Check packaging seals, open box flaps, or missing original wraps.
- [ISSUE: Manufacturing Defect] -> Look for misalignments, paint unevenness, or dimensional flaws.
- [ISSUE: Missing Components] -> Verify if any standard parts/accessories are absent from the set.
- [ANOMALY: Unidentified Issue] -> Flag unexpected anomalies that do not fit standard categories.

PROCESSING INSTRUCTIONS:
1. PRIORITY 1: Validate if the [Visual Tickers] match actual pixel-level evidence in the image.
2. PRIORITY 2: Combine the user's explicit [User Note] with the validated tickers.
3. OUTPUT GENERATION: Return a JSON object formatted as below:

{
  "confidence_score": 0.0 to 1.0,
  "validated_tags": ["list of tags confirmed visually"],
  "visual_findings": "Detailed description of physical evidence found corresponding to tags",
  "action_recommendation": "Suggested next steps (e.g., Return item, Reject, Repair)"
}
```

---

## 4. Payload Serializer (Helpers - TypeScript)

Hàm chuẩn hóa dữ liệu từ React Native State trước khi dispatch API request:

```typescript
export interface AIPayload {
  image_base64: string;
  system_instructions: string;
  user_prompt: string;
}

export const buildAIPayload = (
  imageBase64: string,
  selectedItems: VisualTickerItem[],
  userNote: string
): AIPayload => {
  const formattedTags = selectedItems.map((item) => item.aiTag).join(', ');

  const userPrompt = `
<input_context>
  <visual_tickers>${formattedTags || 'NONE'}</visual_tickers>
  <user_note>${userNote.trim() || 'NONE'}</user_note>
</input_context>

Task: Analyze the image using the provided visual_tickers as visual grounding hints.
`.trim();

  return {
    image_base64: imageBase64,
    system_instructions: 'Refer to SYSTEM ROLE specification.',
    user_prompt: userPrompt,
  };
};
```
