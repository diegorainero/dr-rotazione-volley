//! KitKat (Android 4.4, API 19) compatibility shim.
//!
//! The Rust std and the `getrandom` crate emit dynamic imports for libc
//! symbols that do not exist in KitKat's bionic (`getrandom`,
//! `dl_iterate_phdr`, `__register_atfork`). On API 19 the dynamic linker
//! fails to load the whole library when an import cannot be resolved. These
//! definitions export the symbols from our own library with default
//! visibility, so the loader satisfies the DSO's own imports from itself and
//! never needs the missing bionic ones (KitKat's linker ignores symbol
//! version binding for this). On API 21+ the exports are harmless: our
//! definitions satisfy the imports and the real bionic ones stay unused.
//! All three are off the rendering critical path:
//! - `getrandom` falls back to /dev/urandom (the classic pre-getrandom
//!   fallback, exactly what getrandom itself does on older kernels);
//! - `dl_iterate_phdr` returns 0 without invoking the callback (backtraces
//!   degrade to nothing);
//! - `__register_atfork` is a no-op returning 0 (the app does not rely on
//!   post-fork handlers).
#[cfg(target_os = "android")]
mod imp {
    use std::ffi::c_void;

    /// getrandom(2) shim: read from /dev/urandom.
    #[unsafe(no_mangle)]
    pub unsafe extern "C" fn getrandom(buf: *mut c_void, buflen: usize, _flags: u32) -> isize {
        use std::io::Read;
        if buf.is_null() || buflen == 0 {
            return 0;
        }
        let slice = unsafe { std::slice::from_raw_parts_mut(buf.cast::<u8>(), buflen) };
        match std::fs::File::open("/dev/urandom").and_then(|mut f| f.read_exact(slice).map(|_| f)) {
            Ok(_) => buflen as isize,
            Err(_) => -1,
        }
    }

    /// dl_iterate_phdr shim: no-op, callback never invoked.
    ///
    /// The callback type is kept opaque (pointer + usize + pointer args,
    /// c_int return) since it is never called.
    #[unsafe(no_mangle)]
    pub extern "C" fn dl_iterate_phdr(
        _callback: extern "C" fn(*const c_void, usize, *mut c_void) -> i32,
        _data: *mut c_void,
    ) -> i32 {
        0
    }

    /// __register_atfork shim: no-op, returns success.
    ///
    /// bionic signature: (prepare, parent, child, dso_handle) -> c_int.
    #[unsafe(no_mangle)]
    pub extern "C" fn __register_atfork(
        _prepare: Option<unsafe extern "C" fn()>,
        _parent: Option<unsafe extern "C" fn()>,
        _child: Option<unsafe extern "C" fn()>,
        _dso_handle: *mut c_void,
    ) -> i32 {
        0
    }
}
