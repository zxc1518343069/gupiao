"""Portfolio service exceptions."""


class PortfolioValidationError(ValueError):
    """业务参数校验失败；API 层负责把它翻译成 HTTP 400。"""

    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)

