# Chạy Quick Mark trên máy local với Dev Container

Tài liệu này dành cho môi trường local/VS Code Dev Containers. Nó không yêu cầu
sửa `.replit-artifact/artifact.toml`, không đặt biến `REPLIT_*`, và không thay
đổi cấu hình chạy trên Replit.

## 1. Mở Dev Container và cài dependencies

Mở thư mục repository bằng VS Code, chọn **Dev Containers: Reopen in
Container**, rồi chạy trong terminal của container:

```bash
cd /workspaces/typescript-node/projects
pnpm install --frozen-lockfile
```

Các lệnh bên dưới đều được chạy từ thư mục `projects/`.

## 2. Chạy development

```bash
pnpm --filter @workspace/quick-mark run dev:localhost
```

Metro sẽ chạy tại <http://localhost:8081>. Dev Container đã forward/publish
port `8081`, nên có thể mở URL này từ máy host. Nhấn `w` trong terminal Expo để
mở bản web; thay đổi mã nguồn sẽ tự reload (Fast Refresh).

Nếu port 8081 đã được dùng, chỉ đổi port cho phiên local hiện tại:

```bash
PORT=8082 pnpm --filter @workspace/quick-mark run dev:localhost
```

Sau đó forward port `8082` trong tab **Ports** của VS Code. Việc này không sửa
file cấu hình nào trong repository hay Replit.

Nếu môi trường host khóa pnpm store, chạy trực tiếp trong package:

```bash
cd /workspaces/typescript-node/projects/artifacts/quick-mark
npm run dev:localhost
```

### Chạy trên điện thoại

`localhost` trong container không phải điện thoại. Với Expo Go, có thể thử:

```bash
pnpm --filter @workspace/quick-mark run dev:lan
```

Nếu Docker/Dev Container khiến thiết bị không truy cập được địa chỉ LAN, dùng
tunnel cho phiên phát triển:

```bash
pnpm --filter @workspace/quick-mark run dev:tunnel
```

Hoặc chạy trực tiếp trong package (phù hợp khi quét QR bằng iPhone):

```bash
npm run dev:device
```

QR tunnel phải có dạng `exp://...ngrok...`, không phải `exp://127.0.0.1:8081`.

Quét QR code do Expo hiển thị bằng Expo Go. Tunnel cần kết nối Internet và có
thể chậm hơn LAN.

## 3. Kiểm tra kiểu dữ liệu

```bash
pnpm --filter @workspace/quick-mark run typecheck
```

## 4. Build và chạy output build ở local

Script build hiện tại đóng gói bản Expo Go để phục vụ từ một **domain HTTPS**.
Vì vậy, khi chạy local cần cung cấp hostname công khai/truy cập được qua HTTPS
(ví dụ hostname của reverse proxy hoặc tunnel); `localhost` thuần HTTP không
phù hợp để cài URL bundle vào manifest.

Ví dụ với domain HTTPS đã có sẵn `quick-mark.example.test` và reverse proxy
chuyển tiếp vào port local `3000`:

```bash
EXPO_PUBLIC_DOMAIN=quick-mark.example.test \
  pnpm --filter @workspace/quick-mark run build

PORT=3000 pnpm --filter @workspace/quick-mark run serve
```

Lệnh build tạo `artifacts/quick-mark/static-build/`; lệnh `serve` phục vụ thư
mục đó. Giữ nguyên cùng `EXPO_PUBLIC_DOMAIN` khi build và đảm bảo domain này
thực sự trỏ tới server local qua HTTPS. Nếu chỉ cần phát triển/kiểm tra giao
diện trên máy, dùng lệnh ở mục 2 là lựa chọn đơn giản hơn.

Để chạy lại build sạch, chỉ cần chạy lại lệnh `build`; script tự tạo mới thư
mục `static-build`.

## 5. Build Android và iOS để cài thử / phát hành

`pnpm run build` ở mục 4 là build bundle phục vụ theo cơ chế artifact, **không
phải** file `.aab`/`.apk` hoặc `.ipa` để đưa lên store. Để phát hành mobile,
dùng Expo Application Services (EAS Build). EAS build trên cloud, nên có thể
khởi tạo từ Dev Container bất kể máy host là Windows/Linux; không cần cài Xcode
hay Android Studio để tạo release binary.

### 5.1 Chuẩn bị một lần trước khi build store

1. Tạo/đăng nhập tài khoản Expo; đồng thời cần Google Play Developer cho
   Android và Apple Developer Program cho iOS. EAS có thể tạo và quản lý signing
   credentials trong lúc cấu hình; chỉ dùng một chủ sở hữu tài khoản tin cậy.
2. Chọn identifier duy nhất, ổn định, ví dụ `com.tencongty.tiksnap`. Identifier
   đã phát hành không được đổi cho các bản cập nhật sau.
3. Bổ sung identifier và version vào `app.json` trước bản release đầu tiên.
   Đây là thay đổi cấu hình ứng dụng mobile, không liên quan Replit:

   ```json
   {
     "expo": {
       "version": "1.0.0",
       "android": {
         "package": "com.tencongty.tiksnap",
         "versionCode": 1
       },
       "ios": {
         "bundleIdentifier": "com.tencongty.tiksnap",
         "buildNumber": "1",
         "supportsTablet": false
       }
     }
   }
   ```

   Dùng identifier thực tế của tổ chức, viết thường, và kiểm tra trước khi phát
   hành. `versionCode` (Android) phải tăng ở mọi bản upload; `buildNumber`
   (iOS) cũng phải là số mới cho mỗi build cùng version.
4. Đánh giá quyền truy cập và mô tả trong app. Quick Mark chọn/lưu ảnh và có
   thể gửi ảnh sang AI theo tính năng. Chỉ yêu cầu permission thực sự dùng,
   giải thích rõ lý do trong app, chuẩn bị Privacy Policy công khai, và khai báo
   đúng dữ liệu/ảnh được thu thập hoặc chia sẻ trong biểu mẫu của từng store.
   Không đưa API key AI vào mã ứng dụng; gọi AI qua backend hoặc secret của
   dịch vụ build.

Hiện project chưa có `android.package`, `ios.bundleIdentifier` hay `eas.json`.
Đó là các mục cần thiết cho phát hành; phần còn lại của tài liệu chỉ hướng dẫn
thao tác, không tự ý thêm chúng vào source.

### 5.2 Cấu hình EAS từ Dev Container

Chuyển vào package mobile (các lệnh EAS trong các mục tiếp theo dùng cùng thư
mục này):

```bash
cd /workspaces/typescript-node/projects/artifacts/quick-mark
pnpm dlx eas-cli@latest login
pnpm dlx eas-cli@latest whoami
pnpm dlx eas-cli@latest build:configure
```

Lệnh cuối tạo `artifacts/quick-mark/eas.json` và có thể hỏi Android package / iOS
bundle identifier. Rà soát rồi commit file này cùng thay đổi `app.json`; đây là
cấu hình cho EAS, không phải Replit. Một cấu hình tối thiểu thường có ba profile:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

Profile `development` yêu cầu thêm `expo-dev-client` nếu muốn dùng development
build. Với project hiện tại, Expo Go ở mục 2 đủ cho đa số công việc; chỉ thêm
development build khi cần native module/config không chạy trong Expo Go.

Trước mỗi build release, chạy:

```bash
pnpm --filter @workspace/quick-mark run typecheck
```

### 5.3 Android

**Cài thử nội bộ (APK):**

```bash
pnpm dlx eas-cli@latest build \
  --platform android --profile preview
```

Khi profile có `distribution: "internal"`, EAS tạo artifact cài thử (thường là
APK) và in URL tải về. Cài trên thiết bị test theo hướng dẫn tại URL đó. Đây
không phải file để upload production lên Google Play.

**Build Google Play (AAB):**

```bash
pnpm dlx eas-cli@latest build \
  --platform android --profile production
```

Tải file `.aab` từ EAS Build dashboard, hoặc submit qua EAS sau khi cấu hình
credentials Play Console. Google Play dùng Android App Bundle cho app mới.

### 5.4 iOS

**Cài thử/TestFlight:**

```bash
pnpm dlx eas-cli@latest build \
  --platform ios --profile production
```

EAS sẽ yêu cầu đăng nhập Apple Developer để tạo/chọn certificate và provisioning
profile. Binary iOS store không cài trực tiếp như APK; upload nó vào App Store
Connect, chờ Apple xử lý, rồi phát cho tester qua TestFlight. Có thể tạo build
internal/ad hoc riêng nếu tổ chức đã quản lý UDID thiết bị, nhưng TestFlight là
luồng test beta phù hợp trước khi phát hành công khai.

### 5.5 Build cả hai nền tảng

Sau khi hai platform đã cấu hình thành công:

```bash
pnpm dlx eas-cli@latest build \
  --platform all --profile production
```

Lưu URL build, version, `versionCode`/`buildNumber`, commit SHA và ghi chú thay
đổi vào release note để có thể truy vết từng bản phát hành.

## 6. Đưa Android lên Google Play

1. Đăng ký Google Play Developer, tạo app trong Play Console bằng **đúng** Android
   package đã chọn.
2. Hoàn thành trang Store listing: tên app, mô tả, icon, screenshots điện thoại,
   email liên hệ và URL Privacy Policy.
3. Hoàn thành App content: app access (nếu có đăng nhập), quảng cáo, target
   audience/content rating, Data safety, quyền nhạy cảm và quốc gia phát hành.
   Với tính năng chọn/lưu ảnh hoặc AI, đối chiếu khai báo Data safety với luồng
   dữ liệu thật, kể cả SDK bên thứ ba.
4. Vào **Testing > Internal testing**, tạo release và upload file `.aab` để
   smoke test nhanh. Sau đó dùng **Closed testing** cho nhóm beta.
5. Với tài khoản cá nhân tạo sau 13-11-2023, cần closed test liên tục tối thiểu
   12 tester đã opt-in trong 14 ngày trước khi xin quyền production.
6. Tạo release **Production**, upload AAB mới, kiểm tra Play App Signing, release
   notes, thiết bị/quốc gia và các cảnh báo; gửi review/rollout. Có thể bắt đầu
   rollout theo tỉ lệ nhỏ rồi theo dõi crash và feedback trước khi tăng dần.

Mỗi update cần giữ nguyên package và signing key, đồng thời tăng `versionCode`.

## 7. Đưa iOS lên Apple App Store

1. Đăng ký Apple Developer Program và tạo App ID trùng `ios.bundleIdentifier`.
2. Trong App Store Connect, tạo app record trước khi upload build; điền tên,
   primary language, bundle ID, SKU và quyền sở hữu.
3. Submit file `.ipa` từ EAS vào App Store Connect. Cách tiện nhất là cấu hình
   EAS Submit rồi chạy:

   ```bash
   pnpm dlx eas-cli@latest submit \
     --platform ios --profile production
   ```

   Hoặc tải IPA và upload bằng Transporter trên macOS. Chờ build được Apple xử
   lý trước khi nó xuất hiện trong App Store Connect.
4. Phân phối qua TestFlight, thêm tester nội bộ/bên ngoài, xử lý beta review nếu
   được yêu cầu, và kiểm tra camera/photo picker, lưu ảnh, share sheet, dark mode
   và các thiết bị iPhone hỗ trợ.
5. Hoàn tất metadata: mô tả, keywords, screenshots, support URL, Privacy Policy,
   App Privacy (privacy nutrition label), age rating, thông tin review và demo
   account nếu app có phần bị khoá.
6. Chọn build đã xử lý, gửi **Submit for Review**, trả lời yêu cầu của App Review
   nếu có, rồi phát hành thủ công hoặc tự động khi được duyệt.

Mỗi update phải giữ cùng bundle identifier và tăng `buildNumber`; tăng
`version` khi phát hành version mới cho người dùng.

## 8. Checklist trước khi bấm phát hành

- [ ] `typecheck` xanh; test trên thiết bị Android thật và iPhone thật.
- [ ] App name, icon, splash, screenshots và mô tả đã là bản production.
- [ ] Android package và iOS bundle identifier là final, thuộc quyền kiểm soát
      của tổ chức.
- [ ] Version/build number đã tăng và release notes đã viết.
- [ ] Chỉ yêu cầu quyền cần thiết; nội dung xin quyền khớp hành vi thực tế.
- [ ] Privacy Policy, Data safety (Google) và App Privacy (Apple) được rà soát
      theo mọi SDK/backend/AI đang sử dụng.
- [ ] Không có secret/API key trong repository hay bundle mobile.
- [ ] Đã kiểm thử cài mới, update từ version trước, offline/error state, chọn
      ảnh, lưu ảnh và chia sẻ.
- [ ] Đã phát hành trước qua Internal/Closed testing hoặc TestFlight.

### Tài liệu chính thức

- [Expo: tạo build đầu tiên](https://docs.expo.dev/build/setup/) và
  [cấu hình `eas.json`](https://docs.expo.dev/build/eas-json/)
- [Google Play: tạo và thiết lập app](https://support.google.com/googleplay/android-developer/answer/9859152)
  và [phát hành release](https://support.google.com/googleplay/android-developer/answer/9859348)
- [Apple: tạo app record](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/)
  và [upload build](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/)

## 9. Debug

Giữ terminal Expo đang chạy rồi dùng các phím tắt sau:

| Thao tác | Cách làm |
| --- | --- |
| Mở Expo DevTools | Nhấn `d` |
| Mở bản web | Nhấn `w` |
| Mở JavaScript debugger | Nhấn `j` |
| Reload ứng dụng | Nhấn `r` |
| Xem các phím tắt khác | Nhấn `?` |

Với bản web, mở DevTools của trình duyệt (F12) để xem Console, Network và đặt
breakpoint. Với Expo Go, nhấn `j` để mở debugger do Expo cung cấp, sau đó đặt
breakpoint trong DevTools. Log `console.log` xuất hiện trong terminal Metro và
trong DevTools tương ứng.

## Ghi chú về Replit

- Không chạy `pnpm --filter @workspace/quick-mark run build` nếu không đặt
  `EXPO_PUBLIC_DOMAIN` (hoặc một biến domain tương đương); build sẽ dừng sớm.
- Không cần, và không nên, đặt `REPLIT_INTERNAL_APP_DOMAIN`,
  `REPLIT_DEV_DOMAIN` hay `REPL_ID` cho luồng local này.
- File `.replit-artifact/artifact.toml` được giữ nguyên; các lệnh trong tài
  liệu dùng script đã có trong `package.json`.
