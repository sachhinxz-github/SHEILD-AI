def extract_features(url):
    """Extract features from URL matching the training dataset columns."""
    return {
        'url_length': len(url),
        'n_dots': url.count('.'),
        'n_hypens': url.count('-'),
        'n_underline': url.count('_'),
        'n_slash': url.count('/'),
        'n_questionmark': url.count('?'),
        'n_equal': url.count('='),
        'n_at': url.count('@'),
        'n_and': url.count('&'),
        'n_exclamation': url.count('!')
    }
