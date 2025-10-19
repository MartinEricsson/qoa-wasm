(module
  ;; Memory for decoder state and buffers (imported from host)
  ;; Use short import module/field names to reduce binary size
  (memory (import "e" "m") 0)

  ;; Dequantization lookup table at memory offset 0x0100 (256)
  ;; 16 scale factors × 8 quantized values × 2 bytes (i16) = 256 bytes
  (data (i32.const 256)
    ;; sf=0
    "\01\00" "\ff\ff" "\03\00" "\fd\ff"
    "\05\00" "\fb\ff" "\07\00" "\f9\ff"
    ;; sf=1
    "\05\00" "\fb\ff" "\12\00" "\ee\ff"
    "\20\00" "\e0\ff" "\31\00" "\cf\ff"
    ;; sf=2
    "\10\00" "\f0\ff" "\35\00" "\cb\ff"
    "\5f\00" "\a1\ff" "\93\00" "\6d\ff"
    ;; sf=3
    "\22\00" "\de\ff" "\71\00" "\8f\ff"
    "\cb\00" "\35\ff" "\3b\01" "\c5\fe"
    ;; sf=4
    "\3f\00" "\c1\ff" "\d2\00" "\2e\ff"
    "\7a\01" "\86\fe" "\4c\02" "\b4\fd"
    ;; sf=5
    "\68\00" "\98\ff" "\59\01" "\a7\fe"
    "\6d\02" "\93\fd" "\c6\03" "\3a\fc"
    ;; sf=6
    "\9e\00" "\62\ff" "\10\02" "\f0\fd"
    "\b6\03" "\4a\fc" "\c5\05" "\3b\fa"
    ;; sf=7
    "\e4\00" "\1c\ff" "\f8\02" "\08\fd"
    "\58\05" "\a8\fa" "\50\08" "\b0\f7"
    ;; sf=8
    "\3c\01" "\c4\fe" "\1d\04" "\e3\fb"
    "\67\07" "\99\f8" "\83\0b" "\7d\f4"
    ;; sf=9
    "\a6\01" "\5a\fe" "\7d\05" "\83\fa"
    "\e1\09" "\1f\f6" "\5e\0f" "\a2\f0"
    ;; sf=10
    "\24\02" "\dc\fd" "\24\07" "\dc\f8"
    "\da\0c" "\26\f3" "\fd\13" "\03\ec"
    ;; sf=11
    "\b8\02" "\48\fd" "\10\09" "\f0\f6"
    "\50\10" "\b0\ef" "\60\19" "\a0\e6"
    ;; sf=12
    "\64\03" "\9c\fc" "\4d\0b" "\b3\f4"
    "\57\14" "\a9\eb" "\a3\1f" "\5d\e0"
    ;; sf=13
    "\28\04" "\d8\fb" "\dc\0d" "\24\f2"
    "\f2\18" "\0e\e7" "\cd\26" "\33\d9"
    ;; sf=14
    "\06\05" "\fa\fa" "\c0\10" "\40\ef"
    "\26\1e" "\da\e1" "\e5\2e" "\1b\d1"
    ;; sf=15
    "\00\08" "\00\f8" "\00\18" "\00\e8"
    "\00\28" "\00\d8" "\00\40" "\00\c0"
  )

  ;; Get dequantization value
  ;; params: scalefactor (0-15), quantized (0-7)
  ;; returns: dequantized value
  (func $get_dequant (param $sf i32) (param $q i32) (result i32)
    ;; Calculate index: ((sf << 3) + q) << 1 (16-bit entries)
    local.get $sf
    i32.const 3
    i32.shl
    local.get $q
    i32.add
    i32.const 1
    i32.shl
    i32.const 256
    i32.add
    i32.load16_s
  )

  ;; Read 64-bit big-endian value from buffer
  (func $read_u64 (param $ptr i32) (result i64)
    (local $v i64)

    local.get $ptr
    i64.load
    local.tee $v
    i64.const 0x00ff00ff00ff00ff
    i64.and
    i64.const 8
    i64.shl
    local.get $v
    i64.const 0xff00ff00ff00ff00
    i64.and
    i64.const 8
    i64.shr_u
    i64.or
    local.tee $v
    i64.const 0x0000ffff0000ffff
    i64.and
    i64.const 16
    i64.shl
    local.get $v
    i64.const 0xffff0000ffff0000
    i64.and
    i64.const 16
    i64.shr_u
    i64.or
    local.tee $v
    i64.const 32
    i64.shl
    local.get $v
    i64.const 32
    i64.shr_u
    i64.or
  )

  ;; Read 64-bit big-endian value and advance offset
  ;; Returns (value, new_offset)
  (func $read_u64_advance (param $base i32) (param $offset i32) (result i64 i32)
    local.get $base
    local.get $offset
    i32.add
    call $read_u64
    local.get $offset
    i32.const 8
    i32.add
  )

  ;; Clamp value to range
  (func $clamp (param $v i32) (param $min i32) (param $max i32) (result i32)
    local.get $v
    local.get $min
    i32.lt_s
    if (result i32)
      local.get $min
    else
      local.get $v
      local.get $max
      i32.gt_s
      if (result i32)
        local.get $max
      else
        local.get $v
      end
    end
  )

  ;; LMS predict
  (func $lms_predict (param $c i32) (result i32)
    (local $lms_base i32)
    (local $prediction i32) ;; implicitly initialized to 0
    (local $i i32) ;; implicitly initialized to 0
    
    ;; LMS state base address for this channel: c * 8 * 4 bytes
    ;; Layout: history[4] then weights[4]
    local.get $c
    i32.const 5
    i32.shl
    local.set $lms_base
    
    loop $continue
      local.get $prediction
      local.get $lms_base
      local.get $i
      i32.const 2
      i32.shl
      i32.add
      i32.load
      local.get $lms_base
      local.get $i
      i32.const 2
      i32.shl
      i32.add
      i32.load offset=16
      i32.mul
      i32.add
      local.set $prediction

      local.get $i
      i32.const 1
      i32.add
      local.tee $i
      i32.const 4
      i32.lt_u
      br_if $continue
    end
    
    local.get $prediction
    i32.const 13
    i32.shr_s
  )

  ;; LMS update
  (func $lms_update (param $c i32) (param $sample i32) (param $residual i32)
    (local $lms_base i32)
    (local $delta i32)
    (local $i i32)
    (local $j i32)
    (local $weight i32)
    (local $history i32)
    
    ;; LMS state base address for this channel
    ;; Layout: history[4] then weights[4]
    local.get $c
    i32.const 5
    i32.shl
    local.set $lms_base
    
    ;; delta = residual >> 4
    local.get $residual
    i32.const 4
    i32.shr_s
    local.set $delta
    
    ;; Update weights based on history sign
    loop $continue
      ;; Load history[i] (first 4 ints)
      local.get $lms_base
      local.get $i
      i32.const 2
      i32.shl
      i32.add
      i32.load
      local.set $history
      
      ;; Load weight[i] (next 4 ints)
      local.get $lms_base
      local.get $i
      i32.const 2
      i32.shl
      i32.add
      i32.load offset=16
      local.set $weight
      
      ;; weights[i] += (history[i] < 0) ? -delta : delta
      local.get $history
      i32.const 0
      i32.lt_s
      if
        local.get $weight
        local.get $delta
        i32.sub
        local.set $weight
      else
        local.get $weight
        local.get $delta
        i32.add
        local.set $weight
      end
      
      ;; Store updated weight
      local.get $lms_base
      local.get $i
      i32.const 2
      i32.shl
      i32.add
      local.get $weight
      i32.store offset=16
      
      local.get $i
      i32.const 1
      i32.add
      local.tee $i
      i32.const 4
      i32.lt_u
      br_if $continue
    end
    
    ;; Shift history
    loop $continue2
      ;; history[i] = history[i+1]
      local.get $lms_base
      local.get $j
      i32.const 1
      i32.add
      i32.const 2
      i32.shl
      i32.add
      i32.load
      local.set $history
      
      local.get $lms_base
      local.get $j
      i32.const 2
      i32.shl
      i32.add
      local.get $history
      i32.store
      
      local.get $j
      i32.const 1
      i32.add
      local.tee $j
      i32.const 3
      i32.lt_u
      br_if $continue2
    end
    
    ;; history[3] = sample
    local.get $lms_base
    local.get $sample
    i32.store offset=12
  )

  ;; Decode QOA header
  (func $decode_header (param $input_ptr i32) (param $size i32) (result i32 i32 i32 i32)
    (local $file_header i64)
    (local $frame_header i64)
    (local $total_samples i32)
    (local $channels i32)
    (local $samplerate i32)
    
    ;; Read file header
    local.get $input_ptr
    call $read_u64
    local.set $file_header
    
    ;; Store total samples
    local.get $file_header
    i64.const 0xffffffff
    i64.and
    i32.wrap_i64
    local.set $total_samples
    
    ;; Read first frame header to get channels and samplerate
    local.get $input_ptr
    i32.const 8
    i32.add
    call $read_u64
    local.set $frame_header
    
    ;; Extract channels (byte 0)
    local.get $frame_header
    i64.const 56
    i64.shr_u
    i64.const 0xff
    i64.and
    i32.wrap_i64
    local.set $channels
    
    ;; Extract samplerate (bytes 1-3)
    local.get $frame_header
    i64.const 32
    i64.shr_u
    i64.const 0xffffff
    i64.and
    i32.wrap_i64
    local.set $samplerate
    
    i32.const 8
    local.get $channels
    local.get $samplerate
    local.get $total_samples
  )

  ;; Decode one QOA frame
  (func $decode_frame (param $input_ptr i32) (param $size i32) (param $output_ptr i32) (result i32 i32)
    (local $p i32) ;; implicitly initialized to 0
    (local $frame_header i64)
    (local $channels i32)
    (local $samplerate i32)
    (local $samples i32)
    (local $frame_size i32)
    (local $c i32)
    (local $ch i32)
    (local $history i64)
    (local $weights i64)
    (local $lms_base i32)
    (local $i i32)
    (local $sample_index i32)
    (local $slice i64)
    (local $scalefactor i32)
    (local $slice_end i32)
    (local $si i32)
    (local $predicted i32)
    (local $quantized i32)
    (local $dequantized i32)
    (local $reconstructed i32)
    (local $history_ptr i32)
    
    ;; Read frame header
    local.get $input_ptr
    local.get $p
    call $read_u64_advance
    local.set $p
    local.set $frame_header
    
    ;; Extract frame header fields
    local.get $frame_header
    i64.const 56
    i64.shr_u
    i64.const 0xff
    i64.and
    i32.wrap_i64
    local.set $channels
    
    local.get $frame_header
    i64.const 32
    i64.shr_u
    i64.const 0xffffff
    i64.and
    i32.wrap_i64
    local.set $samplerate
    
    local.get $frame_header
    i64.const 16
    i64.shr_u
    i64.const 0xffff
    i64.and
    i32.wrap_i64
    local.set $samples
    
    local.get $frame_header
    i64.const 0xffff
    i64.and
    i32.wrap_i64
    local.set $frame_size
    
    ;; Read LMS state for each channel
    loop $continue_lms
      ;; Read history and weights
      local.get $input_ptr
      local.get $p
      call $read_u64_advance
      local.set $p
      local.set $history
      
      local.get $input_ptr
      local.get $p
      call $read_u64_advance
      local.set $p
      local.set $weights
      
      ;; LMS state base for this channel
      local.get $c
      i32.const 5
      i32.shl
      local.set $lms_base

      ;; Extract and store history and weights (4 values each)
      i32.const 0
      local.set $i
      loop $continue_extract
        ;; Store history[i] - extract signed 16-bit from top of history
        local.get $lms_base
        local.get $i
        i32.const 4
        i32.mul
        i32.add
        local.tee $history_ptr
        local.get $history
        i64.const 48
        i64.shr_u
        i32.wrap_i64
        i32.const 16
        i32.shl
        i32.const 16
        i32.shr_s
        i32.store
        
        local.get $history
        i64.const 16
        i64.shl
        local.set $history
        
        ;; Store weight[i] - extract signed 16-bit from top of weights
        local.get $history_ptr
        local.get $weights
        i64.const 48
        i64.shr_u
        i32.wrap_i64
        i32.const 16
        i32.shl
        i32.const 16
        i32.shr_s
        i32.store offset=16
        
        local.get $weights
        i64.const 16
        i64.shl
        local.set $weights

        local.get $i
        i32.const 1
        i32.add
        local.tee $i
        i32.const 4
        i32.lt_u
        br_if $continue_extract
      end
      
      local.get $c
      i32.const 1
      i32.add
      local.tee $c
      local.get $channels
      i32.lt_u
      br_if $continue_lms
    end
    
    ;; Decode all slices
    loop $continue_samples
      ;; Decode slices for all channels
      i32.const 0
      local.set $ch
      loop $continue_channels
        ;; Read slice
        local.get $input_ptr
        local.get $p
        call $read_u64_advance
        local.set $p
        local.set $slice
        
        ;; Extract scalefactor (top 4 bits)
        local.get $slice
        i64.const 60
        i64.shr_u
        i64.const 0xf
        i64.and
        i32.wrap_i64
        local.set $scalefactor
        
        ;; Shift slice to position first residual
        local.get $slice
        i64.const 4
        i64.shl
        local.set $slice
        
        ;; Calculate slice bounds
        local.get $sample_index
        local.get $channels
        i32.mul
        local.get $ch
        i32.add
        local.set $si
        
        local.get $sample_index
        i32.const 20
        i32.add
        i32.const 0
        local.get $samples
        call $clamp
        local.get $channels
        i32.mul
        local.get $ch
        i32.add
        local.set $slice_end

        ;; Decode samples in slice
        loop $continue_slice
          ;; Predict
          local.get $ch
          call $lms_predict
          local.set $predicted
          
          ;; Extract quantized value using shift counter
          local.get $slice
          i64.const 61
          i64.shr_u
          i64.const 0x7
          i64.and
          i32.wrap_i64
          local.set $quantized
          
          ;; Dequantize
          local.get $scalefactor
          local.get $quantized
          call $get_dequant
          local.set $dequantized
          
          ;; Reconstruct
          local.get $predicted
          local.get $dequantized
          i32.add
          i32.const -32768
          i32.const 32767
          call $clamp
          local.set $reconstructed
          
          ;; Store sample (16-bit)
          local.get $output_ptr
          local.get $si
          i32.const 1
          i32.shl
          i32.add
          local.get $reconstructed
          i32.store16
          
          ;; Shift slice for next residual
          local.get $slice
          i64.const 3
          i64.shl
          local.set $slice
          
          ;; Update LMS
          local.get $ch
          local.get $reconstructed
          local.get $dequantized
          call $lms_update
          
          local.get $si
          local.get $channels
          i32.add
          local.tee $si
          local.get $slice_end
          i32.lt_u
          br_if $continue_slice
        end
        
        local.get $ch
        i32.const 1
        i32.add
        local.tee $ch
        local.get $channels
        i32.lt_u
        br_if $continue_channels
      end
      
      local.get $sample_index
      i32.const 20
      i32.add
      local.tee $sample_index
      local.get $samples
      i32.lt_u
      br_if $continue_samples
    end
    
    ;; Return bytes consumed and frame samples
    local.get $p
    local.get $samples
  )

  ;; Main decode function
  ;; Export with shorter name to reduce binary size
  (func (export "d") (param $input_ptr i32) (param $size i32) (param $output_ptr i32) (result i32 i32 i32)
    (local $p i32)
    (local $sample_index i32)
    (local $frame_size i32)
    (local $frame_samples i32)
    (local $channels i32)
    (local $samplerate i32)
    (local $total_samples i32)
    
    ;; Decode header
    local.get $input_ptr
    local.get $size
    call $decode_header
    local.set $total_samples
    local.set $samplerate
    local.set $channels
    local.set $p
    
    ;; Decode all frames
    loop $continue
      ;; Decode frame
      local.get $input_ptr
      local.get $p
      i32.add
      local.get $size
      local.get $p
      i32.sub
      local.get $output_ptr
      local.get $sample_index
      local.get $channels
      i32.mul
      i32.const 2
      i32.mul
      i32.add
  call $decode_frame
      local.set $frame_samples
      local.set $frame_size
      
      local.get $p
      local.get $frame_size
      i32.add
      local.set $p
      
      local.get $sample_index
      local.get $frame_samples
      i32.add
      local.tee $sample_index
      local.get $total_samples
      i32.lt_u
      br_if $continue
    end
    
    local.get $total_samples
    local.get $channels
    local.get $samplerate
  )
)
