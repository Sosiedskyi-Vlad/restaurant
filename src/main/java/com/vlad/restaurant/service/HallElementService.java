package com.vlad.restaurant.service;

import com.vlad.restaurant.dto.HallElementDto;
import com.vlad.restaurant.entity.HallElement;
import com.vlad.restaurant.repository.HallElementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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

    @Transactional
    public List<HallElementDto> saveBatch(String zone, List<HallElementDto> dtos) {
        String targetZone = (zone != null && !zone.isBlank()) ? zone : "MAIN";
        // Знаходимо існуючі в цій зоні
        List<HallElement> existing = repository.findByZone(targetZone);
        repository.deleteAll(existing);

        List<HallElement> toSave = new ArrayList<>();
        for (HallElementDto dto : dtos) {
            HallElement el = new HallElement();
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
        return repository.saveAll(toSave).stream().map(HallElementDto::from).toList();
    }

    @Transactional
    public void delete(UUID id) {
        repository.deleteById(id);
    }
}
