package com.atara.deb.ataraapi.dto.catalogo;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CentroEducativoResponseDto {
    private Long id;
    private String nombre;
    private String circuito;
    private String direccionRegional;
    private String telefono;
    private String correo;
}
