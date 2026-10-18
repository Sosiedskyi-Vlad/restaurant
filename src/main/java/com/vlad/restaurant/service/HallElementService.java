package com.vlad.restaurant.service;

import com.vlad.restaurant.dto.HallElementDto;
import com.vlad.restaurant.entity.HallElement;
import com.vlad.restaurant.repository.HallElementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HallElementService {

    private final HallElementRepository repository;

    @Transactional(readOnly = true)
    public List<HallElementDto> getAll(String zone) {
        List<HallElement> list = (zone != null && !zone.isBlank())
                ? repository.findByZone(zone)
                : repository.findAll();
        return list.stream().map(HallElementDto::from).toList();
    }

    // Оновлює існуючі елементи за ID, додає нові та видаляє лише фактично прибрані
    @Transactional
    public List<HallElementDto> saveBatch(String zone, List<HallElementDto> dtos) {
        String targetZone = (zone != null && !zone.isBlank()) ? zone : "MAIN";
        List<HallElement> existing = repository.findByZone(targetZone);
        Map<UUID, HallElement> existingById = existing.stream()
                .filter(e -> e.getId() != null)
                .collect(Collectors.toMap(HallElement::getId, Function.identity()));

        Set<UUID> retainedIds = new HashSet<>();
        List<HallElement> toSave = new ArrayList<>();

        for (HallElementDto dto : dtos) {
            HallElement el = (dto.id() != null && existingById.containsKey(dto.id()))
                    ? existingById.get(dto.id())
                    : new HallElement();
            if (el.getId() != null) {
                retainedIds.add(el.getId());
            }
            el.setName(dto.name() != null ? dto.name() : "Елемент");
            el.setType(dto.type() != null ? dto.type() : "WALL");
            el.setZone(targetZone);
            el.setPositionX(dto.positionX() != null ? dto.positionX() : 50.0);
            el.setPositionY(dto.positionY() != null ? dto.positionY() : 50.0);
            el.setWidth(dto.width() != null ? dto.width() : 16.0);
            el.setHeight(dto.height() != null ? dto.height() : 10.0);
            el.setRotation(dto.rotation() != null ? dto.rotation() : 0);
            toSave.add(el);
        }

        List<HallElement> toDelete = existing.stream()
                .filter(e -> e.getId() != null && !retainedIds.contains(e.getId()))
                .toList();
        if (!toDelete.isEmpty()) {
            repository.deleteAllInBatch(toDelete);
        }

        return repository.saveAll(toSave).stream().map(HallElementDto::from).toList();
    }

    @Transactional
    public void delete(UUID id) {
        repository.deleteById(id);
    }
}
