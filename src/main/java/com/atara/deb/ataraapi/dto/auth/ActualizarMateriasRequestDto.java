package com.atara.deb.ataraapi.dto.auth;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import java.util.List;

@Data
public class ActualizarMateriasRequestDto {

    @NotEmpty(message = "Debes seleccionar al menos una materia.")
    private List<Integer> materiasIds;
}
