package com.vlad.restaurant.service;

import com.vlad.restaurant.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
public class FileStorageService {

    private static final long MAX_FILE_SIZE_BYTES = 10L * 1024 * 1024; // 10 MB
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp"
    );
    private static final Path UPLOAD_DIR = Paths.get("uploads").toAbsolutePath().normalize();

    public String storeImage(MultipartFile file, String prefix) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Файл не обрано або він порожній");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BadRequestException("Розмір файлу перевищує максимально допустимі 10 МБ");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new BadRequestException("Дозволені лише формати зображень JPG, PNG та WEBP");
        }

        validateMagicBytes(file);

        try {
            if (!Files.exists(UPLOAD_DIR)) {
                Files.createDirectories(UPLOAD_DIR);
            }

            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "image.jpg";
            String safeName = originalName.replaceAll("[^a-zA-Z0-9\\.\\-]", "_");
            String safePrefix = (prefix != null && !prefix.isBlank()) ? prefix + "_" : "";
            String filename = safePrefix + UUID.randomUUID() + "_" + safeName;

            Path targetPath = UPLOAD_DIR.resolve(filename).normalize();
            if (!targetPath.startsWith(UPLOAD_DIR)) {
                throw new BadRequestException("Некоректне ім'я файлу");
            }

            try (InputStream in = file.getInputStream()) {
                Files.copy(in, targetPath, StandardCopyOption.REPLACE_EXISTING);
            }

            return "/uploads/" + filename;
        } catch (IOException e) {
            log.error("Помилка збереження файлу зображення", e);
            throw new IllegalStateException("Не вдалося зберегти файл зображення", e);
        }
    }

    public void deleteLocalImageIfPresent(String imageUrl) {
        if (imageUrl == null || !imageUrl.startsWith("/uploads/")) {
            return;
        }
        try {
            String filename = imageUrl.substring("/uploads/".length());
            Path filePath = UPLOAD_DIR.resolve(filename).normalize();
            if (filePath.startsWith(UPLOAD_DIR)) {
                Files.deleteIfExists(filePath);
            }
        } catch (IOException e) {
            log.warn("Не вдалося видалити старий файл зображення {}: {}", imageUrl, e.getMessage());
        }
    }

    private void validateMagicBytes(MultipartFile file) {
        try (InputStream is = file.getInputStream()) {
            byte[] header = is.readNBytes(12);
            if (header.length < 4) {
                throw new BadRequestException("Файл пошкоджено або занадто малий");
            }
            // JPEG: FF D8 FF
            boolean isJpeg = (header[0] & 0xFF) == 0xFF
                    && (header[1] & 0xFF) == 0xD8
                    && (header[2] & 0xFF) == 0xFF;
            // PNG: 89 50 4E 47
            boolean isPng = (header[0] & 0xFF) == 0x89
                    && (header[1] & 0xFF) == 0x50
                    && (header[2] & 0xFF) == 0x4E
                    && (header[3] & 0xFF) == 0x47;
            // WEBP: "RIFF" .... "WEBP"
            boolean isWebp = header.length >= 12
                    && header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
                    && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P';

            if (!isJpeg && !isPng && !isWebp) {
                throw new BadRequestException("Вміст файлу не відповідає формату зображення (JPG/PNG/WEBP)");
            }
        } catch (IOException e) {
            throw new BadRequestException("Не вдалося прочитати вміст файлу");
        }
    }
}
