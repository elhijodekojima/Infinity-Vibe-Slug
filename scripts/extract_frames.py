from PIL import Image

def rebuild_spritesheet(input_path, output_path, frame_width, frame_height, columns_original, frames_to_extract):
    try:
        # Abrir el sprite sheet original
        original_sheet = Image.open(input_path).convert("RGBA")
        
        # Lista para guardar los frames recortados
        extracted_frames = []
        
        for frame_index in frames_to_extract:
            # Calcular la posición X e Y del frame en la imagen original
            col = frame_index % columns_original
            row = frame_index // columns_original
            
            left = col * frame_width
            upper = row * frame_height
            right = left + frame_width
            lower = upper + frame_height
            
            # Recortar y guardar el frame
            frame = original_sheet.crop((left, upper, right, lower))
            extracted_frames.append(frame)
            
        # Crear la nueva imagen (el nuevo sprite sheet en una sola fila)
        new_width = frame_width * len(extracted_frames)
        new_sheet = Image.new("RGBA", (new_width, frame_height))
        
        # Pegar los frames extraídos en el nuevo sprite sheet
        for i, frame in enumerate(extracted_frames):
            new_sheet.paste(frame, (i * frame_width, 0))
            
        # Guardar el resultado
        new_sheet.save(output_path)
        print(f"¡Nuevo sprite sheet guardado con éxito en: {output_path}!")
        
    except Exception as e:
        print(f"Ocurrió un error: {e}")

if __name__ == "__main__":
    # --- Configuración ---
    # 1. Ruta de tu imagen original
    ARCHIVO_ORIGINAL = "tu_spritesheet_original.png"
    # 2. Nombre del archivo que quieres generar
    ARCHIVO_NUEVO = "nuevo_spritesheet.png"
    
    # 3. Ancho y alto de un solo frame (El jugador del de tu proyecto suele ser siempre de 20x32)
    ANCHO_FRAME = 20
    ALTO_FRAME = 32
    
    # 4. Cuántas columnas tiene el sprite sheet original
    COLUMNAS_ORIGINALES = 5 
    
    # 5. Los índices de los frames que quieres (empezando a contar desde 0)
    FRAMES_DESEADOS = [0, 4, 5, 19]

    print(f"Extrayendo frames {FRAMES_DESEADOS} de {ARCHIVO_ORIGINAL}...")
    # Ejecutar la función
    rebuild_spritesheet(ARCHIVO_ORIGINAL, ARCHIVO_NUEVO, ANCHO_FRAME, ALTO_FRAME, COLUMNAS_ORIGINALES, FRAMES_DESEADOS)
